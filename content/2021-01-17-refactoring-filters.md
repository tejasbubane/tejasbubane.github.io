+++
title = "Refactoring Filters"
path = "posts/2021-01-17-refactoring-filters"
[taxonomies]
tags = ["ruby", "refactoring"]
+++

Recently I was working on refactoring some unwieldy code for filtering data. Here's a short story of how it went :slightly_smiling_face:.

<!-- more -->

The code I was refactoring was large, but one repetition particularly stood out:

```ruby
# app/models/user.rb

def self.filter(filters)
  if filters[:status].present?
    User.where(status: filters[:status]
  end
  if filters[:location_id].present?
    User.where(location_id: filters[:location_id])
  end
  # and so on...
end
```

The UI had a large set of filters for filtering through a list - which is what this code does - filters through records from database.

My first thoughts were:

* Why is this code so verbose?

* Why do we need those `if` conditions? Without them, we can just chain those `where` clauses and this code would read so much better!

Let us try removing the conditions. Ohh wait, this code does not have tests! :scream:

Time to flex [rspec][1] muscles :muscle:. **Yeah TDD!**

```ruby
# spec/models/user_spec.rb

it "filters users by status" do
  # Create some users - Arrange
  filtered_users = User.filter(status: "pending").pluck(:id) # Act
  expect(filtered_users).to match_array(users.map(&:id)) # Assert
end
```
Run tests - passes :white_check_mark:

Remove "if" - passes :white_check_mark: As expected.

Now for the real test.. We naturally expect all records to be returned if no filter is applied.

```ruby
# spec/models/user_spec.rb

it "returns all users if no status filter applied" do
  # Create some users - Arrange
  filtered_users = User.filter(status: nil).pluck(:id) # Act
  expect(filtered_users).to match_array(User.pluck(:id)) # Assert
end
```
Run tests - passes :white_check_mark:

Remove "if" - `fails` :x: There you go. That is why we need the condition.

To see what exactly is causing this: _** Hops into REPL **_

```sh
irb(main)> User.count
=> 10
irb(main)> User.where(status: "pending").count
   (1.0ms)  SELECT COUNT(*) FROM "users" WHERE "users"."status" = $1  [["status", "pending"]]
=> 4
irb(main)> User.where(status: nil).count
   (0.9ms)  SELECT COUNT(*) FROM "users" WHERE "users"."status" IS NULL
=> 0
```

Fair enough. [ActiveRecord][2] gets `nil`, it filters by `NULL`. Let us see if we can find a way to somehow still chain those methods.

ActiveRecord expects a [Relation object][3] for chaining to work. Try creating a generic method:

```ruby
# app/models/user.rb

def where_if(filters, attribute:)
  data = filters[attribute]
  return all unless data

  where(attribute => data)
end
```

Changing the `User.filter` method:

```ruby
# app/models/user.rb

def self.filter(filters)
  where_if(filters, :status)
    .where_if(filters, :location_id)
    .where_if(filters, :is_active)
    .where_if(filters, :locale)
    # and some more...
end
```

Much better! :tada:

Taking it a step further, the application had few more listing pages which means other models with similar `.filter` method. Our `.where_if` method is generic enough to be used by all of them.

```ruby
# app/models/concerns/filterable.rb

module Filterable
  def where_if(filters, attribute:, parameter: nil)
    data = parameter ? filters[parameter] : filters[attribute]
    return all unless data

    where(attribute => data)
  end
end
```

And now we can `include Filterable` in all those models having filter. I also went ahead and separated `attribute` and `parameter` which helps in cases where parameter name from frontend does not match the database attribute name in backend.

[1]: https://rspec.info/
[2]: https://guides.rubyonrails.org/active_record_querying.html
[3]: https://api.rubyonrails.org/v6.1.0/classes/ActiveRecord/Relation.html
