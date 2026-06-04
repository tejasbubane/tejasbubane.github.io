+++
title = "Upcoming changes in Rails rate limiter"
path = "posts/rails-rate-limit-upcoming-changes"
[taxonomies]
tags = ["ruby", "rack", "rails"]
+++

A quick look at new rate-limiter features in the upcoming Rails version.

<!-- more -->

Historically we would use [rack-attack][1] for rate limiting, but [Rails 7.2 introduced][2] a [built-in rate limiter][3]:

```ruby
class SignupController < ApplicationController
  rate_limit to: 5, within: 1.minute

  def create
    render plain: "Signed up"
  end
end
```

Upcoming Rails 8.2 adds two useful improvements to the built-in rate limiter. I had mentioned them in [my previous blog on rate limiting][4], but let us look at them in detail here.

# Dynamic limit and window

[Pull request][5]

Previously the limit `to:` and window `within:` parameters only accepted fixed values. Now with Rails 8.2, they can be a callable (method name, proc or lambda) allowing dynamic values:

```ruby
class EmployeesController < ApplicationController
  rate_limit to: :max_requests, within: :max_duration

  def create
    render plain: "Employee created"
  end

  private

  def max_requests
    current_user.admin? ? 1000 : 5
  end

  def max_duration
    current_user.admin? ? 1.hour : 1.minute
  end
end
```

This allows us to change the rate limit based on business logic.

# Duck-typing cache-key object

[Pull request][6]

By default, rate limits are keyed on `remote_ip`. The `by:` option lets you override this key.

For example, if we want to implement a per-user rate limit:

```ruby
class ReportsController < ApplicationController
  rate_limit to: 20, within: 1.minute, by: -> { "user/#{current_user.id}" }
end
```

Or we could move the method to `User` model:

```ruby
class User < ApplicationRecord
  def cache_key
    "user/#{id}"
  end
end
```

```ruby
class ReportsController < ApplicationController
  rate_limit to: 20, within: 1.minute, by: -> { current_user.cache_key }
end
```

Now with Rails 8.2 if `by:` is a callable and returns an object, `cache_key` method will be called on the returned object.

```ruby
class User < ApplicationRecord
  def cache_key
    "rate-limit:user:#{id}"
  end
end
```

```ruby
class ReportsController < ApplicationController
  # by: works because User responds to cache_key.
  rate_limit to: 20, within: 1.minute, by: -> { current_user }
end
```

In this case, Rails will implicitly call `current_user.cache_key` and use it to group rate limits.

Now one might see a few problems with this `cache_key` approach:
- `User` model might have a `cache_key` for another purpose (caching the user itself - not rate limit).
- Rate-limit is not a model responsibility.

Since this is duck-typing, any object responding to `cache_key` works — it doesn't have to be an `ActiveRecord` model. A plain Ruby object works just as well:

```ruby
UserRateLimit = Data.define(:user) do
  def cache_key
    "rate-limit:user:#{user.id}"
  end
end

class ReportsController < ApplicationController
  rate_limit to: 20, within: 1.minute, by: -> { UserRateLimit.new(current_user) }
end
```

All the code and tests can be found in [this gist][7].

[1]: https://github.com/rack/rack-attack
[2]: https://github.com/rails/rails/pull/50490
[3]: https://api.rubyonrails.org/classes/ActionController/RateLimiting/ClassMethods.html
[4]: https://tejasbubane.github.io/posts/rate-limit-rack-app-per-account/
[5]: https://github.com/rails/rails/pull/56128
[6]: https://github.com/rails/rails/pull/55555
[7]: https://gist.github.com/tejasbubane/26f75929e12d05978df647834a316ab7
