# Twilio A2P site deployment checklist

- Review consent disclosures, brand support contact, privacy wording and vendors for accuracy.
- Deploy only after reviewing/merging the PR.
- Verify /contact/, /intake/, /privacy/ and /sms-terms/ on production.
- Ensure both checkbox options initially unchecked and form submission works without consent.
- Submit tests for service, marketing, neither; confirm Formspree records each flag, timestamp, source, consent version and phone number.
- Formspree consent records are not a synchronized Twilio/CRM subscription system. Build SMS permission propagation and unsubscribe suppression before sending.
- Configure STOP and HELP responses and ensure A2P campaign classification and example texts match actual traffic.
- Validate mobile display and Netlify production build.
