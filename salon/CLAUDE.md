## Commit Guidelines
- When commit always sync changes first (git pull/push)
- Version should increase and be part of the commit message
- Current version is v.0.2.5 (updated from v.0.2.4)
- Always sync changes when asked to commit

## Project Context
- Salon management dashboard built with Next.js, Bulma CSS, and Supabase
- Mobile-first responsive design with bottom navigation for mobile
- Features: clients, staff, services, appointments (slots), and business rules management
- Uses modal forms with slide animations for CRUD operations
- Icons from FontAwesome throughout the interface

## Technical Stack
- Next.js 15.3.2 with App Router
- Bulma CSS framework for styling  
- Supabase for backend/database
- React hooks (useState, useEffect) for state management
- SWR for data fetching and caching
- React Hot Toast for notifications

## UI/UX Patterns
- Mobile bottom navigation with icon-only display
- Sticky mobile header with search integration
- Slide-in modal forms from right side
- Clickable rows with chevron icons
- Full-width buttons in forms using Bulma field/control structure
- Compact mobile layouts with inline actions
- Default empty states with helpful messaging

## File Structure Key Components
- `/src/app/dashboard/[bid]/layout.js` - Main dashboard layout with sidebar and bottom nav
- `/src/app/dashboard/[bid]/clients/page.js` - Client management with search
- `/src/app/dashboard/[bid]/staff/page.js` - Staff management 
- `/src/app/dashboard/[bid]/services/page.js` - Service management
- `/src/app/dashboard/[bid]/rules/page.js` - Business hours/rules management
- `/src/hooks/useSupabaseData.js` - Data fetching and mutations
- `/src/components/LogoutButton.js` - Authentication logout component