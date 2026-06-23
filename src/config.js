export const CFG = {
  MAKE_READ_WEBHOOK:     import.meta.env.VITE_MAKE_READ_WEBHOOK     || '',
  MAKE_SEND_WEBHOOK:     import.meta.env.VITE_MAKE_SEND_WEBHOOK     || '',
  MAKE_CONTACT_WEBHOOK:  import.meta.env.VITE_MAKE_CONTACT_WEBHOOK  || '',
  MAKE_REPLIES_READ:     import.meta.env.VITE_MAKE_REPLIES_READ     || '',
  MAKE_REPLIES_WRITE:    import.meta.env.VITE_MAKE_REPLIES_WRITE    || '',
  MAKE_NOTES_WEBHOOK:    import.meta.env.VITE_MAKE_NOTES_WEBHOOK    || '',
  POLL_INTERVAL: 10,
}
