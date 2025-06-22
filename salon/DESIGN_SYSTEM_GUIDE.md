# Salon Management Dashboard - Design System Guide

## Overview
Unified design system implemented across all dashboard pages with consistent styling, sizing, and responsive behavior prioritizing desktop/tablet experience.

## CSS Architecture

### Core Variables
```css
:root {
    /* Typography */
    --font-size-base: 16px;
    --font-size-sm: 14px;
    --font-size-lg: 18px;
    --font-size-xl: 20px;
    --font-size-2xl: 24px;
    --font-size-3xl: 30px;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    
    /* Input System */
    --input-height: 2.5rem;
    --input-padding: 0.75rem 1rem;
    --border-radius: 6px;
    --border-color: #dbdbdb;
    --border-color-focus: #3273dc;
}
```

## Component Classes

### Typography
```jsx
<h1 className="salon-title">Main Title (30px)</h1>
<h2 className="salon-title-lg">Large Title (32px)</h2>
<h3 className="salon-title-md">Medium Title (24px)</h3>
<h4 className="salon-title-sm">Small Title (20px)</h4>
<p className="salon-subtitle">Subtitle Text (18px)</p>
<p className="salon-subtitle-sm">Small Subtitle (16px)</p>
```

### Forms
```jsx
<div className="salon-field">
  <label className="salon-label">Field Label</label>
  <div className="salon-control">
    <input className="salon-input" type="text" />
    <textarea className="salon-textarea" rows="3"></textarea>
    <div className="salon-select">
      <select>
        <option>Option 1</option>
      </select>
    </div>
  </div>
  <p className="salon-help">Help text</p>
</div>
```

### Search with Icons
```jsx
<div className="control has-icons-left has-icons-right is-flex-grow-1 mr-4">
  <input className="salon-input" type="text" placeholder="Search..." />
  <span className="icon is-small is-left">
    <i className="fas fa-search"></i>
  </span>
  <span className="icon is-small is-right is-clickable">
    <i className="fas fa-times"></i>
  </span>
</div>
```

### Size Variants
```jsx
<input className="salon-input salon-input-sm" />    <!-- 2rem height -->
<input className="salon-input" />                    <!-- 2.5rem height -->
<input className="salon-input salon-input-lg" />    <!-- 3rem height -->
```

### State Classes
```jsx
<input className="salon-input is-error" />
<input className="salon-input is-success" />
<p className="salon-help is-error">Error message</p>
```

## Implementation Pattern

### Page Structure
```jsx
export default function Page() {
  return (
    <div className="container py-2 px-2">
      {/* Desktop Header */}
      <div className="is-flex is-justify-content-space-between is-align-items-center mb-4 is-hidden-mobile">
        <div className="control has-icons-left has-icons-right is-flex-grow-1 mr-4">
          <input className="salon-input" type="text" placeholder="Search..." />
          <span className="icon is-small is-left">
            <i className="fas fa-search"></i>
          </span>
        </div>
        <button className="button is-link">+ Add Item</button>
      </div>
      
      {/* Content */}
      <div className="box extended-card">
        {/* Content here */}
      </div>
    </div>
  )
}
```

### Modal Form Pattern
```jsx
<div className="modal is-active">
  <div className="modal-background" onClick={closeForm}></div>
  <div className="modal-card">
    <header className="modal-card-head">
      <p className="modal-card-title">{editing ? 'Edit' : 'Add'} Item</p>
      <button className="delete" onClick={closeForm}></button>
    </header>
    <section className="modal-card-body">
      <form onSubmit={handleSubmit}>
        <div className="salon-field">
          <label className="salon-label">Name</label>
          <div className="salon-control">
            <input className="salon-input" type="text" required />
          </div>
        </div>
        
        <div className="salon-field">
          <label className="salon-label">Category</label>
          <div className="salon-control">
            <div className="salon-select">
              <select>
                <option>Option 1</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="salon-field">
          <div className="salon-control">
            <button className="button is-success is-fullwidth">
              {editing ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </form>
    </section>
  </div>
</div>
```

## Key Features

### Icon Positioning Fix
- Uses `text-indent: 2rem` for proper text spacing with search icons
- `.control.has-icons-left .salon-input { padding-left: 3.75rem !important; }`

### Responsive Behavior
- Desktop/tablet: 2.5rem input height
- Mobile: 3rem input height, 16px font size (prevents iOS zoom)
- Consistent padding and spacing across all screen sizes

### Search Alignment
- Search inputs and buttons perfectly aligned using consistent heights
- Implemented across clients, staff, and mobile layout pages

## Migration Checklist

When adding new pages or components:

- [ ] Replace `className="title is-X"` with `className="salon-title-X"`
- [ ] Replace `className="field"` with `className="salon-field"`
- [ ] Replace `className="label"` with `className="salon-label"`
- [ ] Replace `className="control"` with `className="salon-control"`
- [ ] Replace `className="input"` with `className="salon-input"`
- [ ] Replace `className="textarea"` with `className="salon-textarea"`
- [ ] Replace `className="select is-fullwidth"` with `className="salon-select"`
- [ ] Replace `className="help"` with `className="salon-help"`
- [ ] Remove inline styles: `fontSize`, `paddingTop`, `marginBottom`, etc.
- [ ] Use search pattern for consistent alignment with buttons

## Files Updated

### Core System
- `/src/app/globals.css` - Complete design system implementation

### Dashboard Pages
- `/src/app/dashboard/[bid]/services/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/clients/page.js` - ✅ Complete  
- `/src/app/dashboard/[bid]/staff/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/settings/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/rules/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/chairs/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/shifts/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/profile/page.js` - ✅ Complete
- `/src/app/dashboard/[bid]/layout.js` - ✅ Mobile search updated

## Benefits

- **Consistency**: Unified visual language across all pages
- **Maintainability**: Centralized styling system
- **Performance**: Reduced inline styles, consolidated CSS
- **Accessibility**: Consistent focus states and interactions
- **Responsive**: Mobile-first with proper desktop/tablet scaling
- **Scalability**: Easy to extend and modify system-wide

## Usage Notes

- Always use design system classes instead of Bulma defaults
- Maintain search alignment pattern for new pages with search
- Test responsive behavior on mobile, tablet, and desktop
- Use size variants consistently (sm/default/lg)
- Follow modal form pattern for consistent UX