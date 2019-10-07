---
title: Functor Composition
tags: haskell
---

Composition is the beauty of functional programming & haskell with it's typeclasses excels at this.
Let's see what `Functors` are and how they compose.

<!--more-->

Almost all languages have a way to apply function on all elements of a data structure.

eg. Map in [ruby](https://ruby-doc.org/core-2.6.4/Array.html#method-i-map) &
[javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)

Haskell goes beyond just mapping over array-like objects & allows defining an abstract
method for multiple structures.

## Functors

If we consider the example of a `Maybe` data-type (which `may` hold a value), a common
use-case is to apply function to inner value if it is present:

```haskell
x = Just 1
fmap (+1) x -- # => Just 2
y = Nothing
fmap (+1) y -- # => Nothing
```

One can think of structures as boxes. `fmap` applies function to element inside that box, wraps it in the `same box` and returns it. [link](http://adit.io/posts/2013-04-17-functors,_applicatives,_and_monads_in_pictures.html)

`fmap` is a function of [`Functor` typeclass](https://wiki.haskell.org/Functor) & structures like List & Maybe implement Functor typeclass:

```haskell
class Functor f where
  fmap :: (a -> b) -> f a -> f b -- f is abstract structure here
```

Well-defined functors are structure-preserving - ie. they don't modify the structure.

```haskell
fmap (+2) [1,2,3] -- # => [3,4,5]
```

## Composing Functors

Now suppose we want to apply function to nested lists

```haskell
fmap (fmap (+1)) [[1,2,3],[4,5]] -- # => [[2,3,4],[5,6]]
```

Can we compose these two `fmaps`?

```haskell
fmap1 :: (a -> b) -> (f1 a -> f1 b)
fmap2 :: (x -> y) -> (f2 x -> f2 y)
```

In haskell, all functions are [curried](https://en.wikipedia.org/wiki/Currying) - which means `fmap1` when supplied with
one argument (`a -> b`) returns another function which takes `f1 a` and returns `f1 b`.

Substitute `x -> y` with `f1 a -> f1 b`: (replace `x` with `f1 a` & `y` with `f1 b`)

```haskell
fmap2 :: (f1 a -> f1 b) -> (f2 (f1 a) -> f2 (f1 b))
```

See `f2 (f1 a)` there? Nested structure! We just got `fmap` for a nested structure!

We took the output of `fmap1` - `(f1 a -> f1 b)` and passed it as first argument to `fmap2`. Which is nothing but function composition:

```haskell
(.) :: (b -> c) -> (a -> b) -> a -> c
```

Output of function `a -> b` (b) is passed to `b -> c`.

Above example becomes:

```haskell
fmap2 . fmap1 :: (a -> b) -> (f2 (f1 a) -> f2 (f1 b))
```

Cleaning it up a bit:

```haskell
fmap . fmap :: (a -> b) -> f1 (f2 a) -> f1 (f2 b)
```

Note the entire structure `f1 (f2)` is preserved in the output - only `a`s are transformed to `b`s.

Now we can do this:

```haskell
(fmap . fmap) (+1) [[1,2,3],[4,5]] -- # => [[2,3,4],[5,6]]
```

We jumped inside two lists & applied the function `(+1)`. But note those two structures(functors) need not be lists or rather need not even be of the same type.
They can be different (`f1` & `f2` in above definition), although both must have instances of Functor.

```haskell
(fmap . fmap) (+1) [Just 1, Nothing, Just 2]
-- # => [Just 2, Nothing, Just 3]
```

But why limit to just two?

```haskell
(fmap . fmap . fmap) (+1) [Just [1], Nothing, Just [2]]
-- # => [Just [2],Nothing,Just [3]]
```

Being pure & structure preserving allows Functors to compose in such a neat way. Just beautiful!
