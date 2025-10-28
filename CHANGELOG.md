# Changelog

All notable changes to the Find A Bus project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-10-28

### Added
- **Map Visualization**: Interactive Leaflet map for vehicle tracking
  - Real-time bus location display on OpenStreetMap
  - Custom bus markers with gradient styling and emoji icons
  - Click markers to see detailed popup with vehicle info
  - Auto-zoom to fit all vehicles in view
  - Responsive design (400px desktop, 300px mobile)
  - Dark mode compatible styling
- **Enhanced Adherence Display**: Human-readable schedule adherence
  - Converts seconds to minutes ("5 min late" instead of "300")
  - Shows "On time", "X min early", or "X min late"
  - Applied to both vehicle cards and map popups

### Technical
- Integrated Leaflet.js 1.9.4 via CDN
- OpenStreetMap tile layer for base maps
- Custom divIcon implementation for bus markers
- Lazy-loaded map initialization
- Marker management system (add, clear, auto-fit)

### User Experience
- Visual location tracking instead of just coordinates
- Intuitive map interface for finding buses
- Touch-friendly markers on mobile
- Map auto-hides when no valid coordinates

## [1.1.2] - 2025-10-28

### Fixed
- **CORS**: Vehicle endpoint now uses CORS proxy fallback when blocked by browser
  - TheBus API `/vehicle` endpoint missing CORS headers for GitHub Pages
  - Automatic retry with corsproxy.io when direct request fails
  - Provides graceful error handling if both attempts fail

### Technical
- Extended proxy fallback mechanism to handle XML responses
- Consistent error handling across all API endpoints

## [1.1.1] - 2025-10-28

### Fixed
- **Critical**: Vehicle tracking endpoint now working correctly
  - TheBus API `/vehicle` endpoint returns XML, not JSON
  - Added XML parser (`parseVehicleXML`) to handle vehicle responses
  - Updated `fetchFromApi` to detect vehicle endpoint and parse XML
  - Vehicle data now correctly displayed in the UI

### Added
- `.gitignore` file for common development artifacts (OS files, editor files, logs)

### Technical
- Implemented DOMParser-based XML parsing for vehicle data
- Maintains consistent data structure across all endpoints
- Special handling for "null" string values in XML responses

## [1.1.0] - 2025-10-28

### Added
- **Security**: API keys now stored in sessionStorage by default (cleared on tab close)
- **Security**: "Remember me" checkbox for optional localStorage persistence
- **Security**: Password-type input field for API key with show/hide toggle button
- **Security**: API key validation (length, format, placeholder detection)
- **Security**: Prominent warning banner about API key storage and usage
- **Security**: Clear key button (✕) to instantly remove key from all storage
- **Security**: Comprehensive security considerations section in README
- **UX**: Dynamic help text that reflects current storage mode (temporary vs permanent)
- **UX**: Icon buttons for toggling key visibility and clearing keys
- **Accessibility**: ARIA labels for all new interactive controls
- **Documentation**: Best practices section (DO/DON'T lists)
- **Documentation**: Transparent disclosure of client-side security limitations

### Changed
- API key input field changed from text to password type for better privacy
- Storage mechanism now uses abstraction layer to support both session and local storage
- README updated with detailed security information and user guidance

### Security
- Improved API key protection through multiple layers of defense
- User education about client-side security constraints
- Clear warnings against using production or paid API keys

## [1.0.0] - 2025-10-27

### Added
- Initial release of Find A Bus web application
- Route search by number with optional headsign keyword filtering
- Vehicle tracking by fleet number with real-time position data
- Stop arrivals lookup showing upcoming buses and schedule adherence
- API key persistence using localStorage
- Responsive design with mobile-first approach
- Dark mode support via CSS media queries
- CORS proxy fallback for API requests
- Loading, empty state, and error state UI feedback
- Semantic HTML with proper ARIA attributes for accessibility
- Usage tips panel with helpful information

### Technical
- Vanilla JavaScript (ES6+) with zero dependencies
- Static site compatible with GitHub Pages deployment
- HTML templates for dynamic card rendering
- CSS custom properties for theming
- Automatic retry with CORS proxy on network/parse errors
- Integration with TheBus REST JSON API endpoints

### Fixed (during initial development)
- **2025-10-27**: Fixed vehicle and arrival requests to use correct JSON endpoints
- **2025-10-27**: Implemented CORS error handling with automatic proxy fallback
- **2025-10-27**: Switched all endpoints to TheBus REST JSON API format
- **2025-10-27**: Changed API base to HTTPS for GitHub Pages compatibility
- **2025-10-27**: Updated TheBus API documentation links to use HTTPS

### Style
- **2025-10-27**: Refreshed color palette and typography for better readability
- **2025-10-27**: Improved usage tips panel contrast for accessibility
- **2025-10-27**: Standardized color scheme with dark mode support

### Documentation
- **2025-10-27**: Clarified usage guidance in README
- **2025-10-27**: Added deployment instructions for GitHub Pages
- **2025-10-27**: Documented project structure and features

## Development Notes

### Version 1.1.0 - Security Focus
The 1.1.0 release focused entirely on improving API key security within the constraints of a client-side-only application. While client-side security has inherent limitations, we implemented all practical measures available:
- Temporary storage by default minimizes exposure window
- User education and warnings promote safe practices
- Validation prevents common mistakes
- Easy key management reduces friction for security operations

### Version 1.0.0 - Initial Development
The project was developed rapidly over October 27, 2025, with multiple iterations to fix API integration issues and improve the user interface. Key challenges included:
- CORS restrictions requiring proxy fallback mechanism
- Inconsistent TheBus API endpoint formats
- Balancing modern design with accessibility requirements
- Ensuring GitHub Pages compatibility

## Contributing

Changes should be documented in this file under the [Unreleased] section. When releasing a new version:
1. Move items from [Unreleased] to a new version section
2. Add the release date
3. Update version numbers according to semantic versioning
4. Create a git tag for the release

## Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
- **Technical**: Internal/technical changes
- **Documentation**: Documentation updates
- **Style**: UI/UX improvements
