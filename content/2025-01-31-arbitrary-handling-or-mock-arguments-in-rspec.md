+++
title = "Arbitrary handling of mock arguments in RSpec"
path = "posts/arbitrary-handling-of-mock-arguments-in-rspec"
[taxonomies]
tags = ["rspec", "ruby"]
+++

Testing mock arguments with ease in RSpec.

<!-- more -->

In my previous blog we saw how to [write custom matchers in RSpec][1]. Now we will see how to test arguments of mocked methods.

We usually mock method calls with `expect().to receive()`. Further we can also check if the method was called with correct arguments:

```ruby
expect(service)
  .to receive(:call)
  .with(user, "adjacent", { new: true, force: false })
```

Instead of exact arguments we can also check patterns:

```ruby
expect(service)
  .to receive(:call)
  .with(user, a_kind_of(String), hash_including(new: true))
```

But sometimes we may want to test even more. eg. test if the argument is an array of length lesser than 5, test if the argument is an object with some properties.

RSpec yields all arguments for arbitrary handling allowing us to test them individually:

```ruby
expect(service).to receive(:call) do |args|
  expect(args[0].user.email).to eq("myemail@example.com")
end
```

If your method accepts block, we can even test on that:

```ruby
expect(service).to receive(:call) do |args, &block|
  expect { block.call }.to change(User, :count).by(1)
end
```

A more concrete example is when testing locking mechanism in Rails:

```ruby
bank_account.with_lock do
  transactions.each do |transaction|
    create_bank_transaction
  end
end
```

We usually test this like:

```ruby
expect(bank_account).to receive(:with_lock)
expect(BankAccountTransaction.count).to eq(1)
```

A better way to ensure bank-transaction is created inside lock block would be:

```ruby
expect(bank_account).to receive(:with_lock) do |*_args, &block|
  # block is provided to with_lock method
  # execute the block and test if it creates transactions
  expect { block.call }
    .to change { BankAccountTransaction.count }.from(0).to(1)
end
```

A complete working example can be found in [this gist][3].

RSpec provides a lot of features on mocks and their arguments which you can [refer here][2].

[1]: https://tejasbubane.github.io/posts/rspec-custom-matchers/
[2]: https://github.com/rspec/rspec/tree/main/rspec-mocks#readme
[3]: https://gist.github.com/tejasbubane/897712413c38fd57a3c516c6fae8e13f
