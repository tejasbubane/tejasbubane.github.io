+++
title = "Exception handling with Sidekiq"
path = "posts/2022-05-29-sidekiq-exception-handling"
[taxonomies]
tags = ["ruby", "sidekiq", "exception", "rails"]
+++

Make [Sidekiq][1] play nicely with errors and error-tracking tools.

<!-- more -->

Some intermittent errors are acceptable - especially with Sidekiq having our back with its robust retry mechanism.

Any unhandled exception causes job to fail -> moved to retry queue -> [exponential backoff][2] kicks in.

With the default config, Sidekiq will perform 25 retries over the duration of 21 days.
This makes it a general practice to `not` handle rare errors like external APIs failing - we just allow the job to keep retrying
until the external service comes back online. This is assuming that the job is [idempotent][3] (running it multiple times is not an issue).

However allowing these jobs to fail, registers errors in monitoring tools like [Sentry][4] leading to error-rate spike alerts,
incorrect metrics, etc. So we want to use Sidekiq's retries but exclude such errors from Sentry.

We can simply skip the error in Sidekiq configuration:

```ruby
Raven.configure do |config|
  config.excluded_exceptions += ["NotificationWorker::Error"]
end
```

Make sure to create a custom error. This is global config and you don't want `Net::HTTPError` being excluded
from your entire application.

However there is a small issue. Sometimes the external service could be gone for a long time. After all retries have exhausted,
Sidekiq will move the job to DeadSet. Even though our original error was "acceptable", we don't want jobs to never be executed and
removed from scheduled queues without even knowing. It is always a good idea to be notified of such extreme case.
This can be achieved with [Sidekiq's death handler][5]:

```ruby
Sidekiq.configure_server do |config|
  # We exclude some worker errors from Sentry
  # But if retries exhaust and jobs moved to DeadSet, we should know
  config.death_handlers << ->(_job, ex) do
    message = "#{job['class']} #{job["jid"]} just died with error #{ex.message}."
    Sentry.capture_message(message)
  end
end
```

[1]: https://sidekiq.org
[2]: https://en.wikipedia.org/wiki/Exponential_backoff
[3]: https://en.wikipedia.org/wiki/Idempotence
[4]: https://sentry.io
[5]: https://github.com/mperham/sidekiq/wiki/Error-Handling#death-notification
