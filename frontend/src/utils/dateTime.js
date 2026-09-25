const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(timestamp) {
  return dateTimeFormatter.format(new Date(timestamp))
}
