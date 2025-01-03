+++
title = "Custom matchers in RSpec"
path = "posts/rspec-custom-matchers"
[taxonomies]
tags = ["rspec", "ruby"]
+++

RSpec brings Ruby's readability to testing. Custom matchers take it to the next level :rocket:.

<!-- more -->

I need to write test checking if a token is in certain format. For the sake of simplicity, let us consider the [UUID format][1] (Hex 8-4-4-4-12). A simple test would be:

```ruby
it "has UUID token" do
  expect(token).to match(/^\h{8}-(\h{4}-){3}\h{12}$/)
end
```

Little refactoring:

```ruby
UUID_FORMAT = /^\h{8}-(\h{4}-){3}\h{12}$/.freeze

it "has UUID token" do
  expect(token).to match(UUID_FORMAT)
end
```

But we can do better with custom matcher:

```ruby
require 'rspec/expectations'

UUID_FORMAT = /^\h{8}-(\h{4}-){3}\h{12}$/.freeze

RSpec::Matchers.define :be_a_uuid do |uuid_format: UUID_FORMAT|
  match do |actual|
    actual.match(uuid_format)
  end
end
```

With this we can write:

```ruby
it "has UUID token" do
  expect(token).to be_a_uuid
end
```

Much better! :tada:

Final touch is to customize failure messages to be more readable:

```ruby
require 'rspec/expectations'

UUID_FORMAT = /^\h{8}-(\h{4}-){3}\h{12}$/.freeze

RSpec::Matchers.define :be_a_uuid do |uuid_format: UUID_FORMAT|
  match do |actual|
    actual.match(uuid_format)
  end

  failure_message do |actual|
    "expected #{actual} to be a UUID"
  end

  # used for negation: `expect(token)not.to be_a_uuid`
  failure_message_when_negated do |actual|
    "expected #{actual} not to be a UUID"
  end
end
```

You can find full running example in [this gist][2].

More details about custom matchers are in the [RSpec documentation][3].

[1]: https://en.wikipedia.org/wiki/Universally_unique_identifier
[2]: https://gist.github.com/tejasbubane/bf148676f83917fd8c92455e54131259
[3]: https://rspec.info/features/3-13/rspec-expectations/custom-matchers/define-matcher/
