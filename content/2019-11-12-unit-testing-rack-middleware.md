+++
title = "Unit testing rack middleware"
tags = ["ruby"]
path = "posts/2019-11-12-unit-testing-rack-middleware"
+++

Underneath (almost) all Ruby web application lies the [Rack](http://rack.github.io/) architecture.
With minimal interface, it is simple to write a middleware. Let's see how to test it.

<!-- more -->

A middleware is anything which responds to `call` method ([duck-typing](https://en.wikipedia.org/wiki/Duck_typing)).

**Aside:** Lambdas and procs in Ruby can be executed with `.call` so they can be middlewares as well.

Our example middleware allows requests to pass through only if the required headers are present:

```ruby
class BlockActions
  def initialize(app)
    @app = app
  end

  def call(env)
    unless env["HTTP_X_CLIENT"] == "mobile" && env["HTTP_X_MOBILE_USER_ID"]
      return [
        400, # status
        { "Content-Type" => "application/json" }, # headers
        ["Invalid Request"] # response body
      ]
    end
    @app.call(env)
  end
end
```

Now in order to test this, we have to write [integration tests](https://guides.rubyonrails.org/testing.html#integration-testing)
which is fine, but they are slow. Especially if you want to
benchmark the middleware to see if it is not doing some nasty thing in some edgecase that bumps up your response times.

As described before, rack middleware is a simple class with call method. Let's test it in isolation:

We need 2 things: the middleware instance & env to be passed in. Middleware instance is simple class instance, but to create env,
we will use [MockRequest](https://www.rubydoc.info/gems/rack/Rack/MockRequest)

```ruby
Rack::MockRequest.env_for("/", method: :get)
```

Our middleware does not care about routes so it might as well be:

```ruby
Rack::MockRequest.env_for
```

Putting it into specs:

```ruby
describe BlockActions do
  # Mock env to pass in middleware
  let(:env) { Rack::MockRequest.env_for }

  # dummy app to validate success
  let(:app) { ->(env) { [200, {}, "success"] } }

  subject { BlockActions.new(app) }

  it "allows if client & user-id headers are present" do
    env["HTTP_X_CLIENT"] = "mobile"
    env["HTTP_X_MOBILE_USER_ID"] = 1
    status, _headers, _response = subject.call(env)
    expect(status).to eq(200)
  end

  it "does not allow if client is missing" do
    env["HTTP_X_MOBILE_USER_ID"] = 1
    status, _headers, _response = subject.call(env)
    expect(status).to eq(400)
  end

  it "does not allow if mobile-user-id is missing" do
    env["HTTP_X_CLIENT"] = "mobile"
    status, _headers, _response = subject.call(env)
    expect(status).to eq(400)
  end

  it "does not allow if client is not mobile" do
    env["HTTP_X_CLIENT"] = "jared"
    status, _headers, _response = subject.call(env)
    expect(status).to eq(400)
  end
end
```

Because these are unit tests they run pretty fast:

```
Finished in 0.03861 seconds (files took 0.09118 seconds to load)
4 examples, 0 failures
```

This approach allows us to test all cases & also [benchmark the middleware](https://blog.heroku.com/benchmarking-rack-middleware).

_All code from this blog can be found in [this executable script](https://gist.github.com/tejasbubane/c046640bfb1964e2678aaa138ca8e4bb)._
