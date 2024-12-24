+++
title = "Redis pipelines to the rescue"
path = "posts/redis-pipelines-to-the-rescue"
[taxonomies]
tags = ["redis", "ruby", "caching"]
+++

Walkthrough on a use-case where Redis pipelines saved the day.

<!-- more -->

In my [earlier blog post we saw how using redis connection pools can help us improve performance][1] in a multi-threaded/multi-process application like Rails.
Now we will see another typical scenario where Redis is a bottleneck and how we can optimize it.

I was designing a caching system and ran into a problem where I wanted to delete a bunch of keys on some event and it turned out to be much slower than I expected.

Intuitively I assumed Redis would be fast enough to handle it [with sub-millisecond response times][2].
Turns out Redis uses client-server model and each command waits for response. So if you are sending each delete separately, the latency can add up quickly, more so if you are running Redis on a different server or using a [managed offering][3].

Redis pipelines can be used in such cases to fire multiple commands at once and not wait for response for each individual command. It reads all replies finally at once. This improves throughput (ops/sec).

Here's a simple benchmark on a local Redis instance:

```ruby
require 'redis'
require 'benchmark'

REDIS = Redis.new

def set_data
  100_000.times.with_index do |key, i|
    REDIS.set("key-#{key}", i)
  end
end

Benchmark.bm do |x|
  set_data
  x.report('delete sequential') do
    100_000.times do |key|
      REDIS.del("key-#{key}")
    end
  end

  set_data
  x.report('delete pipeline') do
    REDIS.pipelined do |pipeline|
      100_000.times.with_index do |key, i|
        pipeline.del("key-#{key}", i)
      end
    end
  end
end
```

And the results are as expected - a 5x improvement in response times on `localhost` - and this will only improve significantly on a remote connection.

```sh
       user     system      total        real
delete sequential  2.235531   1.198560   3.434091 (  5.057582)
delete pipeline  1.057324   0.026759   1.084083 (  1.099450)
```

More details and performance charts on pipelines are [available here][4].


[1]: https://tejasbubane.github.io/posts/2020-04-22-redis-connection-pool-in-rails/
[2]: https://redis.io/docs/latest/develop/data-types/json/performance/
[3]: https://app.redislabs.com/
[4]: https://redis.io/docs/latest/develop/use/pipelining/
