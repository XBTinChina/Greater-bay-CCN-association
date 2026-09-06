import { network, forms } from './network';
import { url } from './url';

// Where a "submit something" link goes. The forms under /forms/ need no
// account, but they only work once a coordinator has set submit_url in
// data/network.yml. Until then every route here is the GitHub issue form,
// exactly as before. Pages that offer the web form keep the GitHub form
// next to it as the alternative.

export type SubmitType = 'lab' | 'event' | 'tutorial' | 'position' | 'nomination';

/** True once the web-form endpoint is configured. */
export const hasWebForm = Boolean(String(network.submit_url ?? '').trim());

/** The page of the web form on this site, whether or not it is switched on. */
export const webForm = (type: SubmitType) => url(`forms/${type}/`);

/** The web form when it is switched on, the GitHub issue form otherwise. */
export const submitForm = (type: SubmitType) => (hasWebForm ? webForm(type) : forms[type]);
