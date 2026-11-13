# Lead and AI Visibility Measurement Plan

## GA4 events implemented in the site

| Event | When it fires | Parameters to register as custom dimensions |
| --- | --- | --- |
| `generate_lead` | A contact, intake, or Pipeline Leak Audit form receives a successful response. | `form_name`, `service_interest`, `lead_source`, `lead_qualification` |
| `book_call_click` | A visitor selects a Cal.com booking link. | `service_name`, `cta_location`, `booking_type` |

The events never include names, email addresses, form messages, website addresses, or other personal information.

## GA4 setup

1. Register the event parameters above as event-scoped custom dimensions.
2. Mark `generate_lead` and `book_call_click` as key events.
3. Configure a Cal.com confirmation redirect or webhook that sends a separate `booking_confirmed` event. A click is intent, not a completed appointment.
4. Build a monthly exploration with landing page, `lead_source`, `service_interest`, and session source/medium.

## AI referral reporting

Create a session segment that includes traffic from current AI-assistant referral domains, including `chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, and `copilot.microsoft.com`. Review this segment monthly alongside overall organic search. Referral domains change, so maintain the list from actual GA4 acquisition data rather than treating it as permanent.

## AI answer benchmark

Once a month, ask the same customer-intent questions in the AI assistants relevant to Flatirons clients. Record the date, assistant, prompt, location, answer summary, cited sources, competitors named, Flatirons mention, service named, and any incorrect fact. Use a spreadsheet or CRM table; do not interpret a single answer as a ranking.

Suggested prompts:

- "Who can help a Boulder small business improve visibility in ChatGPT and Google?"
- "What is an AI search visibility audit for a Colorado service business?"
- "Who offers website design and SEO for Boulder professional services firms?"

Use the benchmark and ChatGPT Business Hub insights together: the benchmark shows the answer a buyer receives, while referral and conversion data show whether that visibility produces interest.
