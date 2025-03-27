+++
title = "Pattern matching on custom objects in Ruby"
path = "posts/ruby-pattern-matching-custom-objects"
draft = true
[taxonomies]
tags = ["ruby", "pattern-match"]
+++

Pattern matching in Ruby is not just for arrays and hashes, it can be used for custom objects too.

<!-- more -->

[Ruby 2.7 introduced pattern matching][1]. We can match over basic data types, arrays and hashes:

_(I am using the `=>` syntax for brevity)_

```ruby
1 => Integer
"foo" => String
[1,2,3] => Array
[1,2,3] => [a,b,c] # assigns values a = 1, b = 2, c = 3
{a: 10, b: 20} => { a:, b: } # assigns a = 10, b = 20
```

And raises error when not matched:

```ruby
1 => String
# String === 1 does not return true (NoMatchingPatternError)

[1,2] => [x,y,z]
# [1, 2] length mismatch (given 2, expected 3) (NoMatchingPatternError)

{a: 100, b: 200} => { a:, x:, y: }
# key not found: :x (NoMatchingPatternKeyError)
```

However the interesting part comes when matching non-primitive objects.
You can use `[]` or `()` for matching and can also assign variables:

```ruby
User = Data.define(:name, :email)
u = User.new("Sam", "sam@example.com")

u => User(name, email) # Matches and assigns name = "Sam" and email = "sam@example.com"

# And Obviously fails when matching with a different class:
Account = Data.define(:name, :email)
u => Account(name, email)
# Account === #<data User ...> does not return true (NoMatchingPatternError)
```

Let us look at few more examples:

```ruby
class Event
  attr_reader :name, :venue

  def initialize(name, venue)
    @name = name
    @venue = venue
  end
end

e = Event.new("Music Jam", "Orchird Road")
e => Event(name, venue)
#<Event:...> does not respond to #deconstruct (NoMatchingPatternError)
```

Pattern matching expects custom objects to define `#deconstruct` method. But why did it work with the `Data` objects above? Because `Data` class [already has the method defined][3].

`#deconstruct` is expected to return an array:

```ruby
# Opening the class to define this method
class Event
  def deconstruct
    [name, venue]
  end
end

e => Event(name, venue) # Works! Assigns name = "Music Jam" and venue = "Orchid Road"
```

How about keyword arguments?

```ruby
class Book
  attr_reader :name, :published_year

  def initialize(name:, published_year:)
    @name = name
    @published_year = published_year
  end
end

b => Book[name:, published_year:]
#<Book:...> does not respond to #deconstruct_keys (NoMatchingPatternError)
```

We don't necessarily have to use hash-style syntax in pattern matching just because the initializer accepts keyword arguments.

```ruby
b => Book[name, published_year]
#<Book:...> does not respond to #deconstruct (NoMatchingPatternError)
```

Note the subtle difference in error message - while the array-style pattern matching expects `#deconstruct` method, the hash-style expects `#deconstruct_keys` method.

`#deconstruct_keys` is expected to return a hash:

```ruby
# Opening the class to define this method
class Book
  def deconstruct_keys(keys)
    { name:, published_year: }
  end

  def deconstruct
    [name, published_year]
  end
end

# Now both forms work!
b => Book[name:, published_year:]
b => Book[name, published_year]
```

You must've noticed the `keys` argument to `#deconstruct_keys`. Hash patterns (unlike arrays) also match subhash:

```ruby
[1, 2, 3, 4] => [1, a]
# [1, 2, 3, 4] length mismatch (given 4, expected 2) (NoMatchingPatternError)

{a: 1, b: 2, c: 3, d: 4} => { a: } # Works and assigns a = 1
```

The keys used in pattern matching are passed here to `#deconstruct_keys` which can be used to create the resulting hash.
This is useful when hash creation is expensive, we can calculate only the requested subhash.

[1]: https://www.ruby-lang.org/en/news/2019/12/25/ruby-2-7-0-released/
[2]: https://docs.ruby-lang.org/en/3.4/syntax/pattern_matching_rdoc.html
[3]: https://docs.ruby-lang.org/en/3.4/Data.html#method-i-deconstruct
