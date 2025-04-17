+++
title = "Add IP restriction to Rack app for specific accounts"
path = "posts/ip-restrict-rack-app-per-account"
[taxonomies]
tags = ["ruby", "rack", "rails"]
+++

Exploring an interesting requirement of adding IP restrictions on a Rails app.

<!-- more -->

For a global IP rule on the entire application, my go-to solution is putting a CDN/infrastructure level whitelist rule - minimal, blazing fast, effective and secure.

But this requirement was to allow corporate customers to whitelist specific IPs for their accounts. In other words, their account (and only their specific account)
should be accessible the IPs they specify and be restricted for the outside world.

This makes things ~~complicated~~ interesting. Let us explore the possibilities.

## The Rails way

Since the whitelist will be account-specific and optional, it will be stored in database. In Rails,
the first solution that comes to my mind is to use a `before_action`:

```ruby
class ApplicationController < ActionController::Base
  before_action :require_whitelisted_ip

  def require_whitelisted_ip
    return unless params[:api_key]

    whitelisted_ips = Account.find_by(api_key: params[:api_key])&.whitelisted_ips
    return unless whitelisted_ips.present? # whitelisting is optional, default is to allow everything

    whitelisted_ips.include?(request.remote_ip)
  end
end
```

This is simple, elegant and works as per requirement - but has a downside of having to query the database on every request,
even for invalid ones. For large-scale applications, it is not a good idea to add a global level query for every request.
The performance hits can be massive on the database, not to mention the slowdown in response times.

## Caching

We can fix this by caching the whitelisted IPs in redis/memcache.

```ruby
class ApplicationController < ActionController::Base
  before_action :require_whitelisted_ip

  private

  def require_whitelisted_ip
    return unless params[:api_key]

    whitelisted_ips = Rails.cache.fetch(cache_key(params[:api_key])) do
      Account.find_by(api_key: params[:api_key])&.whitelisted_ips
    end
    return unless whitelisted_ips

    whitelisted_ips.include?(request.remote_ip)
  end
end
```

This significantly reduces the overhead and is highly scalable. We can keep the cache in sync with IPs in database easily
since they don't change very often.

For most applications this is a fine solution. But let us take it up a notch by restricting the invalid requests
even before they hit our Rails controllers!

## Rack :zap:

[Rails is built on Rack][1] - a modular interface for web applications. We can [add a rack middleware][2] to validate IPs.

_Speaking of rack middlewares, [my earlier blog post about unit testing rack middlewares][3] is a fun read._

Creating our own middleware should be fairly easy, but why reinvent the wheel when an extremely minimal tool tailored for
allowing/restricting rack requests exists: [rack-attack][4].

```ruby
# config/initializers/rack_attack.rb

# Rails.cache is not available here: initialize redis connection
REDIS = ConnectionPool.new(size: 5) do
  Redis.new(host: "localhost", port: "6379")
end

class RackAttackHelper
  attr_reader :req

  def initialize(req)
    @req = req
  end

  def blocklisted?
    # allow requests without API key - API key will be validated later
    return false unless api_key

    allowed_ips = REDIS.with { |conn| conn.get(cache_key) }
    # Whitelisting is optional
    # allow if whitelist is not configured for account
    return false unless allowed_ips

    # Redis returns a string, use JSON parse to get an array
    !JSON.parse(allowed_ips).include?(req.ip)
  end

  private

  # Prefer not storing plain API keys in cache for security
  def cache_key
    Digest::SHA1.hexdigest(api_key)
  end

  def api_key
    req.params["api_key"]
  end
end

Rack::Attack.blocklist("whitelist IPs") do |req|
  # Requests are blocked if the return value is truthy
  RackAttackHelper.new(req).blocklisted?
end

Rack::Attack.enabled = true
```

Let us unpack above code: Firstly we store the whitelisted IPs against account's API key.
But we don't have access to `Rails.cache` at rack level, so we need to initialize the redis connection.
If you've read [my blog on redis connection pool][5], you know it is always better to use a connection pool
instead of a single redis connection, especially for high-traffic applications.

We've extracted the logic to check IP in a separate class. We hash the API keys for more security when storing in cache.
We configure `rack-attack` to block requests if request IP does not exist in whitelist.

Finally we can test this entire setup:

```ruby
describe "IP whitelisting" do
  let(:api_key) { SecureRandom.uuid }
  let(:cache_key) { Digest::SHA1.hexdigest(api_key) }
  let(:allowed_ips) { ["10.0.0.1", "10.0.0.106"] }

  around do |example|
    CACHE.set(cache_key, allowed_ips)
    Rack::Attack.enabled = true
    example.run
    CACHE.del(cache_key)
    Rack::Attack.enabled = false
  end

  before do
    allow_any_instance_of(Rack::Attack::Request)
      .to receive(:ip).and_return(request_ip)
  end

  context "when IP does not exist in safelist" do
    let(:request_ip) { "10.0.0.200" }

    it "returns success when IP exists in safelist" do
      get "/", { api_key: }

      expect(last_response.status).to eq(403)
      expect(last_response.body).to eq("Forbidden\n")
    end
  end
end
```

Sidenote: For plain rack apps without Rails, I found [rack-test][6] a nifty tool for testing.

Was this rack solution a bit overkill? Probably. Did I have fun exploring this solution? Definitely.

All code along with tests can be found in [this executable gist][7].

[1]: https://guides.rubyonrails.org/rails_on_rack.html
[2]: http://railscasts.com/episodes/151-rack-middleware
[3]: https://tejasbubane.github.io/posts/2019-11-12-unit-testing-rack-middleware/
[4]: https://github.com/rack/rack-attack
[5]: https://tejasbubane.github.io/posts/2020-04-22-redis-connection-pool-in-rails/
[6]: https://github.com/rack/rack-test
[7]: https://gist.github.com/tejasbubane/b10977b0c7d92060369e591eedcab7ab
