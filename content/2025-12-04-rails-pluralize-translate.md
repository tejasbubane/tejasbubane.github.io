+++
title = "Rails pluralization with translations"
path = "posts/2025-12-04-rails-pluralize-translate"
[taxonomies]
tags = ["rails", "i18n", "pluralize"]
+++

A short blog on some tips to cleanly pluralize and translate content in Rails.

<!-- more -->

Even after 12 years of working with Rails, I still keep discovering these small but extremely useful utilities.
Today was one such day and I'll share a couple tips related to pluralization and translations.

## Scoped translations

Translations can get deeply nested leading to long strings:

```ruby
I18n.t("activerecord.errors.messages.record_invalid")
I18n.t("users.profile.popup.title")
```

Note that you have to read the entire string to understand what this translation is for, because the real key is last part (`record_invalid` and `title`).

Rails allows specifying scope on translation which makes it better to read:

```ruby
I18n.t(:record_invalid, scope: [:activerecord, :errors, :messages])
I18n.t(:title, scope: [:users, :profile, :popup])
```

At first glance we see this translation is for `record_invalid` and `title`.

## Pluralized translations

The [pluralize][1] helper method is pretty commonly used:

```ruby
pluralize("day")   # => "days"
pluralize("hour")  # => "hours"
```

But what if we need to support multiple languages?

```yaml
en:
  items:
    zero: Zero items
    one: One item
    other: Many items
```

```yaml
es:
  items:
    zero: Cero artículos
    one: Un artículo
    other: Muchos artículos
```

```ruby
if items.count == 0
  I18n.t("items.zero")
elsif items.count == 1
  I18n.t("items.one")
else
  I18n.t("items.other")
end
```

Instead Rails provides a handy `:count` helper:

```ruby
I18n.t("items", count: items.count)
```

More details in [Rails guides][2].

[1]: https://api.rubyonrails.org/classes/ActiveSupport/Inflector.html#method-i-pluralize
[2]: https://guides.rubyonrails.org/i18n.html#pluralization
