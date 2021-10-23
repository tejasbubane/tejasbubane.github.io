+++
title = "Complete testing of sidekiq jobs"
path = "posts/2021-10-23-complete-testing-sidekiq"
[taxonomies]
tags = ["ruby", "sidekiq", "testing", "rails"]
+++

In this post we will see how to test async [sidekiq][1] jobs end-to-end.

<!-- more -->

Let us take an example of a background worker for generating exports:

```ruby
# app/workers/sales_export_worker.rb

class SalesExportWorker
  include Sidekiq::Worker

  def perform(account_id, exporter_user_id)
    calculate_sales
    calculate_taxes
    consolidate
    generate_xls
    generate_pdf
    compress_into_zip
    email_to_admin
  end

  private
  # each of the above steps is a private method
end
```

This is being called from controller:

```ruby
# app/controller/exports_controller.rb

class ExportsController < ApplicationController
  def export
    SalesExportWorker.perform_async(account.id, current_user.id)
    render json: { message: "You will receive export zip email shortly." }
  end
end
```
This worker is doing quite a lot of things. For sure the calculations come with complexities and edge-cases.
Writing end-to-end tests for these is a challenge because adding so many scenarios in controller specs would be slow to run.

[An ideal approach][3] here would be to write extensive unit tests for worker in isolation and then test whether controller
schedules the job. Unit tests run an order of magnitude faster than controller specs which allows us to cover all possible
scenarios without worrying about slowing our CI builds.

Sidekiq provides testing utilities with 3 modes:
* `fake`: Jobs remain in queue and not processed
* `inline`: Run all jobs immediately within same process
* `disable`: Disable test utility, push jobs to redis

For unit tests we actually need to execute jobs to assert against their behaviour.
So we can either invoke the worker directly or use `inline` mode:

```ruby
# spec/workers/sales_export_worker_spec.rb

describe SalesExportWorker do
  it 'generates export with proper sales fgures' do
    # Approach 1: invoke worker directly
    SalesExportWorker.new.perform(account.id, user.id)
    # assertions
  end

  it 'adds correct taxes' do
    # Approach 2: Inline mode
    Sidekiq::Testing.inline! do
      SalesExportWorker.perform_async(account.id, user.id)
    end
    # assertions
  end

  # Lot more scenarios here covering all edge cases
end
```

Now all that remains is to test if our controller schedules this worker. Remember to use `fake` mode here
because we do not need to run the worker:

```ruby
# spec/requests/exports_controller_spec.rb

describe 'Exports', type: :request do
  it 'schedules export worker' do
    Sidekiq::Testing.fake! { post '/exports' }
    expect(SalesExportWorker.jobs.size).to eq(1)
  end
end
```

We missed one important detail here. We are only testing the job array size. It would be better to test job arguments as well.
Remember that the `fake` testing mode pushes jobs to an array. Peeking inside the array object we can see `args`:

```
[1] pry> ExportWorker.jobs
=> [{"retry"=>true,
  "queue"=>"exports",
  "class"=>"ExportWorker",
  "args"=>[12],
  "jid"=>"7ae4c9d5974b1d11f079b255",
  "created_at"=>1634585856.609544,
  "enqueued_at"=>1634585856.6097648}]
```

```ruby
# spec/requests/exports_controller_spec.rb

describe 'Exports', type: :request do
  it 'schedules export worker' do
    Sidekiq::Testing.fake! { post '/exports' }

    # Ensure no duplicate jobs
    expect(SalesExportWorker.jobs.size).to eq(1)

    # Check if arguments passed in correct order
    expect(SalesExportWorker.jobs[0]['args]).to eq([account.id, admin.id])
  end
end
```

Now we are in a good shape with the tests! :tada:

[1]: https://sidekiq.org
[2]: https://github.com/mperham/sidekiq/wiki/Testing
[3]: https://martinfowler.com/bliki/TestPyramid.html
