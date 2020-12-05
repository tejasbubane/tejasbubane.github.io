+++
title = "Serializers Everywhere"
tags = ["ruby"]
path = "posts/2019-01-21-serializers-everywhere"
+++

Manage multiple versions of [JSON serializers](https://github.com/rails-api/active_model_serializers) in a [Rails](https://rubyonrails.org/) application with ease.

<!-- more -->

**Aside:** Even though Rails has an [inbuilt mechanism](https://api.rubyonrails.org/classes/ActiveModel/Serializers/JSON.html#method-i-as_json)
to serialize domain objects,
[ActiveModel Serializers](https://github.com/rails-api/active_model_serializers) (AMS) is a
popular library for decoupling the serialization logic from database layer. This post assumes usage of AMS.

Change is the only constant in software development and it is the view or presentation layer
that changes the most. In case of API-only apps, JSON schema is the view.

Assume we have resources like `product` and `inventory` with corresponding serializers.

Now product info is also required in inventory details.
Using [`belongs_to` association](https://github.com/rails-api/active_model_serializers/blob/v0.10.6/docs/general/serializers.md#associations)
would pick the main product serializer which would render the entire product details which we don't need.
So we create another serializer `InventoryProductSerializer` because adding some method with hand-rolled json is not a good practice - which is exactly why we use serializers in the first place.

Then we also have `delivery_order` - which also needs product info but with slightly different fields.
We think of saving those precious bytes on the network by sending only required fields and not single more. So we religiously create `DeliveryOrderProductSerializer`.
This goes on and on...

```sh
product_serializer.rb
inventory_product_serializer.rb
delivery_order_product_serializer.rb
```

Lets take a moment and see if we can reduce this. Ideally `inventory-product` serializer will be used `**only**` by `inventory` serializer.
So why not somehow put it inside `InventorySerializer` where it belongs?

We can conveniently take advantage of Ruby's `constant lookup algorithm` to do this:

```ruby
class InventorySerializer < ActiveModel::Serializer
  attributes :id, :location, :quantity
  has_one :product

  # Return only required attributes here to keep API small
  class ProductSerializer < ActiveModel::Serializer
    attributes :id, :name, :price
  end
end
```

```ruby
class DeliveryOrderSerializer < ActiveModel::Serializer
  attributes :id, :quantity, :price, :source, :destination
  has_one :product

  # Return only required attributes here to keep API small
  class ProductSerializer < ActiveModel::Serializer
    attributes :id, :name
  end
end
```

While looking up for any constant (here the class constant `ProductSerializer`), it is first looked up inside the serializer class itself.
We have one there and which gets used. The next lookup of outer global `ProductSerializer` in `product_serializer.rb` never happens in this case.

Thus we have achieved colocated concerns. Hope this helps.

Happy hacking!
