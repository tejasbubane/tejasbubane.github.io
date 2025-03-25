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
validates :price, numericality: { greater_than: 0 }
validates :discount, numericality: { in: 0..100 }
validates :product_sku, length: { 8 }
```

But in today's age of microservices, application-level constraints may not be enough.
There could be multiple services trying to update the data, one of which missing the validation.

Above single-column cases should generally work fine with a monolith.
But let us consider a case where we want to ensure either the `user_id` or `channel_id` must be present:

```ruby
validates :user_id, presence: true, if: -> { channel_id.blank? }
validates :channel_id, presence: true, if: -> { user_id.blank? }
```

In this case, multiple threads could try to remove one of those ids at the same time, each perfectly passing the Rails validation - and ending up with incorrect data.

This is where we need database constraints to ensure atomic consistency at the database level. We can use a `CHECK` constraint with any expression that evaluates to a boolean.
For above example, we need the [`num_nonnulls` operator][2]:

```ruby
class AddConstraintOnOrders < ActiveRecord::Migration[7.0]
  def change
    add_check_constraint :orders, "num_nonnulls(user_id, channel_id) > 0",
      name: "orders_user_or_channel_present"
  end
end
```

`add_check_constraint` [was added in Rails 6.1][3], but you can use plain SQL migrations with earlier Rails versions. Make sure to name the constraint, otherwise the database will generate a generic name like `chk_rails_abcdef` which is difficult to debug.

We can also compare two columns - and you can also add the constraint at the time of table creation:

```ruby
class CreateEvents < ActiveRecord::Migration[7.0]
  def change
    create_table :events, force: true do |t|
      t.string :name
      t.timestamp :starts_at
      t.timestamp :ends_at
      t.check_constraint "ends_at > starts_at", name: :events_starts_greater_than_ends
    end
  end
end
```

Read more about PostgreSQL constraints in the [docs][4].

Failure of constraint raises `ActiveRecord::StatementInvalid` error.

All code can be found in executable format in [this gist][5].

[1]: https://tejasbubane.github.io/posts/2021-12-18-rails-7-postgres-generated-columns/
[2]: https://www.postgresql.org/docs/current/functions-comparison.html
[3]: https://github.com/rails/rails/commit/1944a7e74c6c1b7a6234414a00d294412c05fde1
[4]: https://www.postgresql.org/docs/current/ddl-constraints.html
[5]: https://gist.github.com/tejasbubane/7427d13355140cc66a5f910a484a699c
