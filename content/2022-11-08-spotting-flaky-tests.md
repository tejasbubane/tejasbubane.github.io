+++
title = "Spotting flaky tests"
path = "posts/2022-11-08-spotting-flaky-tests"
[taxonomies]
tags = ["ruby", "testing", "rails"]
+++

Sharing some examples of flaky tests from my experience.

<!-- more -->

Some of these are trivial, others slightly complex. Examples use Ruby on Rails but the ideas and patterns are language agnostic.

## Array ordering

```ruby
expect(user.locations).to eq([location_1, location_2, location_3])
```

Records being fetched from database by default may not have any order:

```
irb(main)> User.last.locations

SELECT  "locations".* FROM "locations" WHERE "locations"."user_id" = $1
```

But [`eq`][1] expects array elements to be in exact same order `[location_1, location_2, location_3]`, which makes this test flaky.
If ordering is not expected, [use `match_array` instead][2] (also available with alias `contain_exactly`).

```ruby
expect(user.locations).to match_array([location_1, location_2, location_3])
```

## Validation errors

Activerecord runs **all** validations and collects them in arrays.

```ruby
expect(user.errors.messages[:name][0]).to eq("must be filled")
```

Although validations run in the order they are defined, with growing codebase, custom validations and refactorings
it is better not to rely on something irrelevant such as order of validations.

A better way to make this test resilient is to check if error exists.

```ruby
expect(user.errors.messages[:name]).to include("must be filled")
```

_Sidenote:_ Use [shoulda-matchers][3] so you don't have to test trivial validations explicitly.

## Sidekiq mode switch

[Refer my previous blog for understanding Sidekiq's testing modes][4].

Your tests may be order dependent:

```ruby
# Fake is sidekiq's default mode
# Change to execute background Job inline for this one test
before { Sidekiq::Testing.inline! }
# Execute code and test

# If any future test (even in another file) expects fake mode, it will fail.
```

Always make sure to set the mode back or use blocks.

```ruby

Sidekiq::Testing.inline! do
  # Execute code and test
end
```

## Locale switch

Same as above Sidekiq example, switching locale also makes tests order dependent and hence flaky. Use blocks:

```ruby
# default locale :en

I18n.with_locale(:hi) do
  I18n.locale #=> :hi
end

# default locale back to :en
# Any future test expecting default locale will not be affected.
```

## Implicit cast

```ruby
context 'when user does not exist' do
  before { params[:id] = SecureRandom.uuid }

  it 'returns user not found error' do
    expect { UserService.new(params).call }.to raise_error
  end
end

class UserService
  def initialize(params)
    @user = User.find(params[:id])
  end
  # more code...
end
```

If `id` is an integer and not a `uuid`, guess what? This test can randomly fail!

ActiveRecord will cast `uuid` to integer while constructing SQL query (because the underlying column is integer)
and there could be chances of previously created user's id matching.

Make sure to always use correct data types:

```ruby
before { params[:id] = 0 }
```

[1]: https://relishapp.com/rspec/rspec-expectations/docs/built-in-matchers/equality-matchers
[2]: https://relishapp.com/rspec/rspec-expectations/docs/built-in-matchers/contain-exactly-matcher
[3]: https://github.com/thoughtbot/shoulda-matchers
[4]: http://127.0.0.1:1111/posts/2021-10-23-complete-testing-sidekiq/
