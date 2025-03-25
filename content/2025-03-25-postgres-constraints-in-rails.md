+++
title = "Using PostgreSQL database constraints"
path = "posts/using-postgres-database-constraints-in-rails"
[taxonomies]
tags = ["postgreSQL", "database", "rails", "ruby"]
+++

Effective use of database constraints can ensure data integrity.

<!-- more -->

In an earlier blog post we used [generated columns in PostgreSQL][1]. In this one we will explore another cool database feature - `constraints`.

Many times applications add some business constraints on our data.

eg.
* `price` must be positive
* `discount` must be between 0 and 100
* `product_sku` must be 8 character long, etc.

We can encode these in Rails model validations:

```ruby
validates :price, comparison: { greater_than: 0 }
validates :discount, comparison: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
validates :product_sku, length: { 8 }
```

But in today's age of microservices, application-level constraints may not be enough.
There could be multiple services trying to update the data, one of which missing the validation.

Above single-column cases should generally work fine with a monolith.
But let us consider a case where we want to ensure either the `customer_id` or `channel_id` must be present:

```ruby
validates :customer_id, presence: true, if: -> { channel_id.blank? }
validates :channel_id, presence: true, if: -> { customer_id.blank? }
```

In this case, multiple threads could try to remove one of those ids at the same time, each perfectly passing the Rails validation - and ending up with incorrect data.

This is where we need database constraints to ensure atomic consistency at the database level. We can use a `CHECK` constraint with any expression that evaluates to a boolean.
For above example, we need the [`num_nonnulls` operator][2]:

```ruby
class AddConstraintOnOrders < ActiveRecord::Migration[7.0]
  def change
    add_check_constraint :orders, "num_nonnulls(user_id, channel_id) > 0"
  end
end
```

`add_check_constraint` [was added in Rails 6.1][3], but you can use plain SQL migrations with earlier Rails versions.

We can also compare two columns:

```ruby
class AddConstraintOnEvents < ActiveRecord::Migration[7.0]
  def change
    add_check_constraint :events, "end_time > start_time"
  end
end
```

Read more about PostgreSQL constraints in the [docs][4].

[1]: https://tejasbubane.github.io/posts/2021-12-18-rails-7-postgres-generated-columns/
[2]: https://www.postgresql.org/docs/current/functions-comparison.html
[3]: https://github.com/rails/rails/commit/1944a7e74c6c1b7a6234414a00d294412c05fde1
[4]: https://www.postgresql.org/docs/current/ddl-constraints.html
