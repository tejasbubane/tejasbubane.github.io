+++
title = "Typescript Distributive Union Types"
path = "posts/2026-06-28-typescript-distributive-union-types"
[taxonomies]
tags = ["typescript"]
+++

A quick look at the interesting behavior of TypeScript `generics` in combination with `unions`.

<!-- more -->

I am digging deeper into TypeScript which reminds me of my [Haskell days][1] - it has been a while and I don't remember much Haskell now, but the good feeling stays and so do my static type skills which I promptly decided to exercise now with Typescript.

## Unions

We can combine any two types into a [Union][2] type.

```ts
type StringOrNumber = string | number;
```

Or with TypeScript's [literal types][3]:

```ts
type UserRole = "employee" | "admin" | "superadmin"
```

## Generics

Assume we have entities like `User`, `Company`, `Course`, etc., we can create an `ApiResponse`:

```ts
type ApiResponse = {
    data: User | Company | Course
    status: number
}
```

But then every time we add a new entity in our system, we also need to update the ApiResponse. Instead we can use [generics][4]:

```ts
type ApiResponse<T> = {
    data: T;
    status: number;
}
```

And then use it like `ApiResponse<User>`, `ApiResponse<Company>`, `ApiResponse<Course>`.

## Conditional Types

For example, if we have types:

```ts
type Employee = {...};
type Admin = Employee & {...};
type SuperAdmin = Admin & {...};
```

We can create separate permissions for all admins (which includes `Admin` and `SuperAdmin`) using [conditional types][5].

```ts
type Permissions<T> = T extends Admin ? AdminPermissions : EmployeePermissions;
```

## Distributive Unions

Generics can accept any type including Unions:

```ts
type Users = Array<User | Admin | SuperAdmin>;
```

Now `Users` is of type `(User | Admin | SuperAdmin)[]`. Which means it is an array whose elements could be a mix of any of those three types of users. What if for some reason we want to ensure all elements of the array are of the same type? i.e. `User[] | Admin[] | SuperAdmin[]`

Essentially we want to "loop" over the union (`User | Admin | SuperAdmin`) and make each type an array. Conditional types have this "looping" behavior, formally called `distributivity`. We can use this to our benefit here:

```ts
type StrictArray<T> = T extends T ? T[] : never

type Users = StrictArray<User | Admin | SuperAdmin>
```

Now we have the desired type `User[] | Admin[] | SuperAdmin[]`.

That `T extends T` seems redundant, but it is a dummy conditional to activate the distributivity .

[1]: https://github.com/tejasbubane/haskell-book-code
[2]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
[3]: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types
[4]: https://www.typescriptlang.org/docs/handbook/2/generics.html
[5]: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
