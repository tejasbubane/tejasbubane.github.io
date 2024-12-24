+++
title = "Caching optimizations"
path = "posts/caching-optimizations"
[taxonomies]
tags = ["caching", "ruby", "redis"]
+++

Some good practices when building a robust cache for backend web applications.

<!-- more -->

In my [earlier blog post we saw how redis pipelines can be used to improve caching performance][1]. Now we will see some other effective optimizations which can significantly improve our caching performance. This post focuses on API response caching with JSON, backed by Redis. But the ideas are generic and can be applied elsewhere as well.

# Split cache

We want to achieve maximum cache hit ratio but have a large data to be cached. Some or the other entity within that JSON keeps updating and invalidating the cache. For example consider the following structure of cache:


* `checkout_page_cache`
```json
{
  "shopping_cart": {...},
  "orders": {...},
  "user": {...}
}
```

With this structure, cache will invalidate when any product within shopping cart, order status or user profile change. More invalidations means more cache miss and less performance.

On average, shopping cart changes way more often than user profile. If we split up the cache into separate parts, when shopping cart updates, we don't need to update user JSON. Not only does this increase cache hits, it also reduces DB queries for fetching related entities. So instead of single `checkout_page_cache` we have three separate ones:

* `shopping_cart_cache`
* `orders_cache`
* `users_cache`

# Separate cache store

Applications generally use Redis for multiple purposes apart from caching. eg. storing background jobs for [sidekiq][4]. Recommended configuration for cache store usually differs from these tools. Also for separation of concerns we should separate these. Ideally separate Redis instances would be great but at the very least we should use separate databases.

# Configuration

All cache keys should have an expiry. The redis instance should have `maxmemory-policy` (eviction policy) set so it doesn't run out of memory - you can find [all supported eviction policies and their details here][2]. It is also recommended to set read and write timeouts. More info on [Redis cache configuration for Rails is available here][3].

# Versioning

Adding versions helps ease cache schema changes.
eg: shopping cart cache:

```json
[
  {
    "product_id": 123,
    "quantity": 1,
  },
  {
    "product_id": 129,
    "quantity": 2,
  }
]
```

We decide to store basic product (name and thumbnail) info to save DB queries:

```json
[
  {
    "product": {
      "id": 123,
      "name": "Water Bottle",
      "thumbnail": "https://example.com/water-bottle.jpg"
    },
    "quantity": 1
  },
  {...}
]
```

Such a change will make cache inconsistent and will need workarounds in code to handle both cases (existing + new caches). Adding version helps with better handling and debugging which can be done in few different ways:

## 1. Adding version to JSON body:

```json
[
  {
    "product": {
      "id": 123,
      ...
    },
    "quantity": 1,
    "version": 1
  },
  {
    "product": {
      "id": 129,
      ...
    },
    "quantity": 1,
    "version": 1
  },
]
```

Clearly this is not the best way since it requires storing version at multiple places (especially in our example of arrays) and increases cache size.

## 2. Using redis databases:

If our cache store is Redis, we can switch to a new DB when we change the schema. This has a drawback: we start fresh on new DB and our application will receive heavy cache miss and DB load for a brief period during transition.

## 3. Adding version to cache key:

We can add version number to the cache key in addition to entity ID. eg. `user_123_v1`. Here's a generic class to make it easier:

```ruby
class CacheStore
  VERSION = '1'.freeze

  def self.get(key, ttl)
   conn.get(key_name(key), ttl)
  end

  def self.key_name(key)
    "#{key}-#{VERSION}"
  end
end

CacheStore.get("user-#{user.id}")
```


[1]: https://tejasbubane.github.io/posts/redis-pipelines-to-the-rescue/
[2]: https://redis.io/docs/latest/develop/reference/eviction/
[3]: https://guides.rubyonrails.org/caching_with_rails.html#activesupport-cache-rediscachestore
[4]: https://sidekiq.org/
