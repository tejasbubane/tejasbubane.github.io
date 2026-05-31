+++
title = "Adding account-specific rate limits in a Rails app"
path = "posts/rate-limit-rack-app-per-account"
[taxonomies]
tags = ["ruby", "rack", "rails"]
+++

We can easily configure global rate limits, but how can we make them dynamic?

<!-- more -->

In a [previous post][1] I explored how to add account-specific IP whitelisting in a Rails/rack app. This post follows the same pattern — this time adding per-account rate limiting.

We generally add global rate limits via nginx or CDN - a limit of X requests per minute/hour for a particular IP. But some customer accounts in my application needed extra limits for API usage and were willing to pay more for it 💰, however the default limit should stay for remaining customers. This meant the global CDN rate limit would not work.

Rate limiting is hard to implement from scratch - we need to count the number of requests during an interval (generally per minute but could also be per hour). [rack-attack][2]'s throttle configuration handles this precisely: it restricts requests to a given limit within a given period.

A very basic config would look like this:

```ruby
# config/initializers/rack_attack.rb

Rack::Attack.throttle("requests per API token", limit: 20, period: 60) do |request|
  request.headers["Api-Token"]
end
```

This will only allow 20 requests per minute for an API token.

But that limit of 20 requests is static and configured once in the initializer. Our requirement demands dynamic limit per account to be taken from database. For this, rack-attack provides an option to pass a limit `proc` to be called for each request to get the limit.

```ruby
# config/initializers/rack_attack.rb

Rack::Attack.throttle('request per API token', limit: limit_proc, period: 60) do |request|
  request.headers["Api-Token"]
end
```

And our `limit_proc` can use the API token to fetch associated account and its limit from the database.

```ruby
# config/initializers/rack_attack.rb

limit_proc = proc do |req|
  token = request.headers["Api-Token"]

  custom_limit = ApiToken.find_by(token:)&.account&.rate_limit

  (custom_limit || DEFAULT_RATE_LIMIT).to_i
end
```

`rack-attack` also allows passing proc for `period`, but we don't need it in our case so we keep it fixed to 60 seconds.

This works but the proc is called for every request issuing a database query on every request, including invalid ones with unrecognised tokens. This can be optimized using cache:

```ruby
# config/initializers/redis.rb

REDIS = ConnectionPool.new(size: 20, timeout: 5) do
  Redis.new(url: ENV['REDIS_URL'])
end
```

To see why I use a connection pool, read [my previous blog][3].

```ruby
# config/initializers/rack_attack.rb

limit_proc = proc do |req|
  token = request.headers["Api-Token"]

  custom_limit = REDIS.with do |conn|
    conn.get("api_rate_limit:#{token}")
  end

  (custom_limit || DEFAULT_RATE_LIMIT).to_i
end
```

```ruby
# app/models/account.rb

def set_rate_limit(token, rate_limit)
  cache_key = "api_rate_limit:#{token}"

  REDIS.with do |conn|
    conn.set(cache_key, rate_limit)
  end
end
```

The cache entry is written whenever an account's rate limit is saved, and rack-attack reads it on each incoming request, so our hot path is free of database calls.

Thus with rack-attack throttle and Redis cache, we have a performant, per-account configurable rate limiting.

## Rails built-in rate-limit

A quick note on why I ~did~ could not [Rails' own rate-limit][4]:

* My app was running an older version of Rails which did not have the built-in rate limit.
* At the time of writing this (May 2026), there are a couple things that Rails rate limiter does not support:
   - Dynamic(callable) arguments as limit. [Added recently][5] but not yet released.
   - Rate limit on something other than `remote_ip` (API token in our example). [Also added recently][6] but not yet released.

[1]: https://tejasbubane.github.io/posts/ip-restrict-rack-app-per-account/
[2]: https://github.com/rack/rack-attack
[3]: https://tejasbubane.github.io/posts/2020-04-22-redis-connection-pool-in-rails/
[4]: https://api.rubyonrails.org/classes/ActionController/RateLimiting/ClassMethods.html
[5]: https://github.com/rails/rails/pull/56128
[6]: https://github.com/rails/rails/pull/55555
