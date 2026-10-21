import { lightTheme } from './themes';
import { legacyColors } from './legacyTheme';

/** Static fallback for non-rendering utilities; screens use the theme provider. */
export const colors = legacyColors(lightTheme);
