+++
title = "Upcoming changes in Rails rate limiter"
path = "posts/rails-rate-limit-upcoming-changes"
[taxonomies]
tags = ["ruby", "rack", "rails"]
+++

Rails 7.2 introduced a built-in rate limiting and now the next version of Rails has a few nice improvements lined up.

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

In the upcoming Rails 8.2, two new features will be quite useful. I had mentioned them in [my previous blog on rate limiting][4], but let us look at them in detail here.

# Dynamic duration and window

[Pull request][5]

Previously the duration `to:` and window `within:` parameters only accepted fixed values. Now they can be a callable (method name, proc or lambda) allowing dynamic values:

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

Default rate limit is on `remote_ip`. Now you can pass object which responds to `cache_key`:

```ruby
class User < ApplicationRecord
  def cache_key
    "user/#{id}"
  end
end
```

```ruby
class ReportsController < ApplicationController
  rate_limit to: 20, within: 1.minute, by: -> { current_user }
end
```

This implements a per-user rate limit.

All the code code and tests can be found in [this gist][7].

[1]: https://github.com/rack/rack-attack
[2]: https://github.com/rails/rails/pull/50490
[3]: https://api.rubyonrails.org/classes/ActionController/RateLimiting/ClassMethods.html
[4]: https://tejasbubane.github.io/posts/rate-limit-rack-app-per-account/
[5]: https://github.com/rails/rails/pull/56128
[6]: https://github.com/rails/rails/pull/55555
[7]: https://gist.github.com/tejasbubane/26f75929e12d05978df647834a316ab7
