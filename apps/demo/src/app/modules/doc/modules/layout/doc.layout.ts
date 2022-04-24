
export const DOC_LAYOUT_ROUTES = [{
  icon: 'view_module',
  title: 'Bar',
  detail: 'dbx-bar',
  ref: 'doc.layout.bar'
}, {
  icon: 'view_module',
  title: 'Content',
  detail: 'dbx-content',
  ref: 'doc.layout.content'
}, {
  icon: 'view_module',
  title: 'Flex',
  detail: 'dbxFlexGroup',
  ref: 'doc.layout.flex'
}, {
  icon: 'view_module',
  title: 'Section',
  detail: 'dbx-section',
  ref: 'doc.layout.section'
}, {
  icon: 'list',
  title: 'List',
  detail: 'dbx-list',
  ref: 'doc.layout.list'
}, {
  icon: 'view_column',
  title: 'Two Columns',
  detail: 'dbx-two-columns',
  ref: 'doc.layout.two'
}];

export const DOC_LAYOUT_ROOT_ROUTE = {
  icon: 'view_module',
  title: 'Layout',
  detail: 'layouts',
  ref: 'doc.layout.home',
  children: DOC_LAYOUT_ROUTES
};
