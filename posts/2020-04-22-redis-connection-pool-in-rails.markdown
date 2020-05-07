---
title: Redis connection pool in Rails
tags: ruby
---

Rails is multi-threaded, but can your redis connection handle it?

<!--more-->

**TLDR:** Use [connection_pool][4] gem.

Activerecord - rails' database access library - [comes with inbuilt connection pool][1]. We can change the pool size via `config/database.yml`:

```yml
production
  adapter: postgresql
  pool: 20
```

We use [redis][2] for variety of purposes like caching, queuing, pubsub, etc. But when it comes to connecting to redis, we don't have any inbuilt connection pool.
So generally we end up using just one direct connection, mostly via a configuration or application-level global variable.

```ruby
# config/initializers/redis.rb

REDIS = Redis.new(host: "10.0.1.1", port: 6380, db: 15)

# accessing data
REDIS.get(<key>)
REDIS.set(<key>, <value>)
```

Thanks to the [ludicrous speed of redis][3], most queries return in milliseconds & we don't see any issues even with multiple parallel connections.
But note that this is a shared blocking resource. `Shared` because we have just one connection across multiple application threads & `blocking` because
on a single connection [redis will block the next query until the previous one returns][6]. Which means that this can have cascading effects.

## Problem

Let's do some benchmarking with that single connection:

```ruby
require 'benchmark'

# simulate blocking shared resource
REDIS = Mutex.new

# blocks for 10 milliseconds
incr = -> { sleep(0.010) }

Benchmark.bm do |x|
  x.report("single") { incr.call } # returns in 10 milliseconds

  threads = []
  x.report("multi-threaded") do
    100.times do
      threads << Thread.new {
        REDIS.synchronize { incr.call }
      }
    end

    # join to depict how much time the last waiting thread takes
    threads.each { |thr| thr.join }
  end
end
```

And we are in for a surprise!

```sh
       user     system      total        real
single  0.000055   0.000018   0.000073 (  0.012773)
multi-threaded  0.014485   0.023569   0.038054 (  1.197625)
```

With 100 parallel queries, our result times jumped from 10ms to 1 second.
This is cascading effect and the load time of 1 second for redis is just plain bad.

Of-course this is hypothetical, but note that I have considered RTT (round-trip time) for request 10ms
considering local connection. For remote connections over HTTP, these can go up to 250-300ms for a single query.

## Solution

Use [connection_pool][4] gem. It comes from the creator of [sidekiq][5] and is pretty easy to use:

With rails we need something like this:

```ruby
# config/initializers/redis.rb
pool_size = 20
REDIS = ConnectionPool.new(size: pool_size) do
  Redis.new(host: <host>, port: <port>)
end

# accessing data
REDIS.with do |conn|
  conn.get(<key>)
  conn.set(<key>, <value>)
end
```

When required `REDIS.with` will pick a connection from the pool (if available - otherwise wait),
perform operations & return connection back to the pool.
`pool_size` is the max number of redis connections that will be established at any point of time.
Connections get created as and when required, but never exceed the `pool_size`.

It seems reasonable to keep `pool_size` equal to max number of threads of our application server.

Let's check benchmarks with `connection_pool`:

```ruby
require 'benchmark'
require 'connection_pool'

# simulate blocking shared resource - but now with a pool of them
REDIS = ConnectionPool.new(size: 100) do
  Mutex.new
end

# blocks for 10 milliseconds
incr = -> { sleep(0.010) }

Benchmark.bm do |x|
  x.report("single") { incr.call } # returns in 10 milliseconds

  threads = []
  x.report("multi-threaded") do
    100.times do
      threads << Thread.new {
        REDIS.with { |conn|
          conn.synchronize { incr.call }
        }
      }
    end

    # join to depict how much time the last waiting thread takes
    threads.each { |thr| thr.join }
  end
end
```

And here are the results:

```sh
       user     system      total        real
single  0.000048   0.000040   0.000088 (  0.010704)
multi-threaded  0.005984   0.006500   0.012484 (  0.017754)
```

Much better!

_Refer [this gist][7] for all benchmarking code._

[1]: https://api.rubyonrails.org/v6.0.2/classes/ActiveRecord/ConnectionAdapters/ConnectionPool.html
[2]: https://redis.io/
[3]: https://redis.io/topics/benchmarks
[4]: https://github.com/mperham/connection_pool
[5]: https://sidekiq.org/
[6]: https://redis.io/topics/pipelining
[7]: https://gist.github.com/tejasbubane/18fcb441f7bf067e5963f1af262a2945
