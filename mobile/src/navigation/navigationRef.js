import { createNavigationContainerRef } from '@react-navigation/native';

// Lets code outside the component tree (e.g. a notification-tap handler in
// App.js) navigate without needing a screen's own `navigation` prop.
export const navigationRef = createNavigationContainerRef();
