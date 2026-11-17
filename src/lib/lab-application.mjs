/** Shared by the email form and its no-JavaScript email template. */
export const labEmailFields = [
  { name: 'pi', label: 'PI name (Latin script)', required: true },
  { name: 'pi_native', label: 'PI name in another script' },
  { name: 'lab', label: 'Lab name' },
  { name: 'institution', label: 'Institution', required: true },
  { name: 'department', label: 'Department' },
  { name: 'city', label: 'City', required: true },
  { name: 'tier', label: 'Membership', type: 'select', required: true },
  { name: 'website', label: 'Lab website', type: 'url' },
  { name: 'profile', label: 'ORCID or other research profile', type: 'url' },
  { name: 'email', label: 'Email address to publish', type: 'email', help: 'Optional. Leave blank to keep your email address off the lab listing.' },
  { name: 'keywords', label: 'Research keywords', required: true, help: 'Up to eight topics, separated by commas.' },
  { name: 'description', label: 'Short lab description', type: 'textarea', required: true, maxLength: 700, help: 'One or two sentences about your research. Up to 700 characters.' },
  { name: 'looking_for', label: 'Recruitment or collaboration interests', type: 'textarea', maxLength: 300 },
  { name: 'submitter', label: 'Your name, if you are submitting for the PI', help: 'Explain how the PI can confirm the entry in your email.' },
];

export const labEmailConfirmations = [
  { name: 'authority', label: "I am the PI, or I have the PI's agreement to submit this entry." },
  { name: 'consent', label: 'I agree to publication of the listing text under CC BY 4.0. Any photo I attach may be displayed on the network website and channels, but is not licensed for reuse.' },
  { name: 'privacy', label: 'I have read the privacy and consent statement.' },
];

/** @param {Record<string, string>} values */
export function labApplicationErrors(values) {
  /** @type {Record<string, string>} */
  const errors = {};
  for (const field of labEmailFields) {
    if (field.required && !values[field.name]?.trim()) errors[field.name] = 'Please complete this field.';
  }
  const topics = (values.keywords || '').split(/[,，;；\n]+/).filter((topic) => topic.trim());
  if (topics.length < 1 || topics.length > 8) errors.keywords = 'Please enter one to eight research keywords, separated by commas.';
  for (const confirmation of labEmailConfirmations) {
    if (values[confirmation.name] !== 'yes') errors[confirmation.name] = 'Please confirm before preparing your email.';
  }
  return errors;
}

/** @param {Record<string, string>} values */
export function labApplicationBody(values = {}) {
  const fields = labEmailFields.map(({ name, label, required }) =>
    `${label}: ${values[name]?.trim() || (required ? '[please fill in]' : '[optional]')}`,
  );
  const confirmations = labEmailConfirmations.map(({ name, label }) =>
    `${values[name] === 'yes' ? '[Confirmed]' : '[Please confirm]'} ${label}`,
  );
  return [
    'Hello,',
    '',
    'I would like to add our lab to the GBA-CCN Network.',
    '',
    ...fields,
    '',
    'Photo (optional): attach a square portrait of the PI to this email. Without a photo, the listing will show initials.',
    '',
    ...confirmations,
    '',
    'Thank you.',
  ].join('\n');
}

/** @param {string} recipient @param {string} subject @param {string} body */
export function labApplicationMailto(recipient, subject, body) {
  return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
