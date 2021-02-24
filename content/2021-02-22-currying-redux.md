+++
title = "Currying Reducers"
path = "posts/2021-02-22-currying-reducers"
[taxonomies]
tags = ["redux", "javascript", "functional programming"]
+++

Yesterday I was reading [curried (partial) functions in Scala][11] and I remembered the first time I used them in an actual production application.

<!-- more -->

This was with a [ReactJS][1] [SPA][2] which used [Redux][3] for managing state.

**Note:** This blogpost assumes that the reader has basic understanding of [Redux][3] - namely [defining][13] and [combining][14] reducers.

The application I worked on was fetching data from backend APIs with paginated results and uniform response structure.

For example:

```json
GET /products

{
  "items": [
    {"name": "Foo", "age": 13},
    {"name": "Bar", "age": 16},
    ...
  ],
  "total_count": 108,
  "total_pages": 11
}
```

For which I wrote a reducer:

```js
// productsReducer.js

// status of data fetch - to show loaders on page
const status = (state = null, action) => {
  // based on action.type return either of "in-progress", "success", "failure"
}

const items = (state = [], action) => {
  switch (action.type) {
    case "FETCH_PRODUCTS_SUCCESS":
      return action.items;
    case "FETCH_PRODUCTS_FAILURE":
      return []; // clear existing data in store
    default:
      return state;
  }
}

const totalCount = (state = 0, action) => {
  // same as `items` - return action.total_count if success
}

const totalPages = (state = 0, action) => {
  // same as `items` - return action.total_pages if success
}

export default combineReducers({
  status,
  items,
  totalCount,
  totalPages
});
```

But this was just for one API. There were a few more:

```json
GET /orders
{
  "items": [
    ...
  ],
  "total_count": ..
  "total_pages": ..
}
```

```
GET /warehouse_locations
// and so on...
```

As I wrote the second reducer for `orders`, I realized there was clearly a pattern here - a pattern that mirrored the backend API structure. But how do we harness this to create a good abstraction?

If we could pass another argument to the reducer functions - say `type` which is `"products"`, `"orders"`, etc. -
that would help us define different [action-types][12] for each API.
But the problem is those reducers are invoked by `redux` library.
Javascript being [dynamically typed][7] will happily allow us to add a third parameter,
but its value would end up being `undefined` always because redux will not pass any value there.
So we cannot just add a third argument to every function. The function we provide to redux
has to match the function signature:

```js
(state = <initValue>, action) => {}
```


I was studying functional programming back then with
[Dan Grossman's fantastic course on Coursera][6] which I highly recommend to any programmer -
irrespective of the language you work with.

[Functional programming][5] invariably means `functions as first-class citizens` i.e. functions are
just like any other values (integers, strings, etc.). Functions can be passed around as arguments and
returned as return-values from other functions. And redux being designed in a functional way helps us here.

:sparkles: Enter `currying` :sparkles:

[Currying][4] is a technique which splits one function that takes multiple arguments into multiple functions
each taking one or more arguments.

In our case, we can create a higher-order function that takes the `listType` argument, then builds and returns another function which matches the signature that redux expects.

```js
// listReducer.js

const listReducer = listType => {
  const type = listType.toUpperCase();

  const items = (state = [], action) => {
    switch (action.type) {
      case `FETCH_${type}_SUCCESS`:
        return action.items;
      case `FETCH_${type}_FAILURE`:
        return [];
      default:
        return state;
    }
  }

  // stripping other functions for brevity

  return combineReducers({
    status,
    items,
    totalCount,
    totalPages
  })
}
```

See full code in [this gist][8].

Here's how we now use our `listReducer`:

```js
// index.js - top-level reducer

const rootReducer = combineReducers({
  products: listReducer("products"),
  orders: listReducer("orders"),
  warehouse_locations: listReducer("warehouse_locations"),
  ...
})
```

These type of reducers are also sometimes called `higher-order reducers` -
because they are [higher-order functions][9].

If you found this interesting, also check out [higher order components][10].

[1]: https://reactjs.org/
[2]: https://en.wikipedia.org/wiki/Single-page_application
[3]: https://redux.js.org/
[4]: https://en.wikipedia.org/wiki/Currying
[5]: https://en.wikipedia.org/wiki/Functional_programming
[6]: https://www.coursera.org/learn/programming-languages
[7]: https://en.wikipedia.org/wiki/Dynamic_programming_language
[8]: https://gist.github.com/tejasbubane/aa7477ca98c4c667a49d3eaf692dc717
[9]: https://en.wikipedia.org/wiki/Higher-order_function
[10]:https://reactjs.org/docs/higher-order-components.html
[11]: https://www.coursera.org/lecture/progfun1/lecture-2-2-currying-fOuQ9
[12]: https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers#designing-actions
[13]: https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers#writing-reducers
[14]: https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers#combining-reducers
