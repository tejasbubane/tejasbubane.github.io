+++
title = "PostgreSQL generated columns in Rails"
path = "posts/2021-12-18-rails-7-postgres-generated-columns"
[taxonomies]
tags = ["rails", "postgreSQL"]
+++

Rails 7 added support for PostgreSQL generated columns.

<!-- more -->

To understand what generated columns are, let us take a simple example of orders table:

```ruby
create_table :orders, force: true do |t|
  t.integer :id
  t.integer :user_id
  t.decimal :price, :decimal, precision: 8, scale: 2
  t.decimal :tax, :decimal, precision: 8, scale: 2
end
```

When displaying a list orders, we almost always need the total (= price + tax). Also we need to perform some filtering & sorting based on total.

[Generated columns][1] were introduced in PostgreSQL 12. These are useful when storing some data which is calculated using other columns.

[Rails 5.1.0 added support for such columns in MySQL and MariaDB][2], but it was not supported by Rails' postgreSQL adapter until now. [Rails 7 adds this support for postgreSQL][3], so we can write:

```ruby
create_table :orders, force: true do |t|
  t.integer :user_id
  t.decimal :price, precision: 8, scale: 2
  t.decimal :tax, precision: 8, scale: 2
  t.virtual :total, type: :decimal, as: 'price + tax', stored: true
end
```

And use it as follows:

```ruby
order = Order.create!(user_id: 1, price: 120, tax: 10)
order.reload
order.total # => 130
```

Note that the object returned by `create!` does not have `total` yet, since it is calculated at database level during insert/update.
We can get it by refetching the record.

Database always keeps generated columns up-to-date when any of its constituent columns are changed.
One less thing to worry about.

```ruby
order.update(price: 130)
order.reload
order.total # => 140
```

They are actual columns in database so we can add indexes on them and also run queries:

```ruby
Order.where("total >= ?", 100)
```

This query is much efficient than iterating over all orders, calculating total and then filtering.

Pretty neat!


_Code for this blog can be found in [an executable gist here][4]._


[1]: https://www.postgresql.org/docs/12/ddl-generated-columns.html
[2]: https://github.com/rails/rails/commit/65bf1c60053e727835e06392d27a2fb49665484c
[3]: https://github.com/rails/rails/pull/41856
[4]: https://gist.github.com/tejasbubane/88e504513a4d42afacde86f3194fc040
