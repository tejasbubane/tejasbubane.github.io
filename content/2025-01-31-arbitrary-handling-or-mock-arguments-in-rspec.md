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

RSpec provides a lot of features on mocks and their arguments which you can [refer here][2].

[1]: https://tejasbubane.github.io/posts/rspec-custom-matchers/
[2]: https://github.com/rspec/rspec/tree/main/rspec-mocks#readme
