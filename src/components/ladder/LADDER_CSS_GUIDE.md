# Ladder Table CSS Guide

## Column Layout (Left to Right)
1. **Rank** - Position number (#1, #2, etc.)
2. **Player** - Player name
3. **Fargo** - FargoRate rating
4. **W** - Wins count
5. **L** - Losses count  
6. **Status** - Player status (Active, etc.)
7. **Last Match** - Last match info

## Key CSS Classes & What They Control

### Main Table Structure
```css
.ladder-table.logged-in-view          /* Main table container */
.ladder-table:not(.logged-in-view)    /* Public view table */
```

### Headers (Column Titles)
```css
.header-cell:nth-child(1)             /* Rank header */
.header-cell:nth-child(2)             /* Player header */
.header-cell:nth-child(3)             /* Fargo header */
.header-cell:nth-child(4)             /* W header */
.header-cell:nth-child(5)             /* L header */
.header-cell:nth-child(6)             /* Status header */
.header-cell:nth-child(7)             /* Last Match header */
```

### Data Cells (Row Content)
```css
.table-cell.rank                      /* Rank data */
.table-cell.name                      /* Player name data */
.table-cell.fargo-rate                /* FargoRate data */
.table-cell.wins                      /* Wins data */
.table-cell.losses                    /* Losses data */
.table-cell:nth-child(6)              /* Status data */
.table-cell.last-match                /* Last Match data */
```

## Common Positioning Properties

### Move Elements Left/Right
```css
margin-left: 20px;                    /* Move right */
margin-left: -20px;                   /* Move left */
transform: translateX(20px);          /* Move right */
transform: translateX(-20px);         /* Move left */
```

### Change Column Width
```css
min-width: 80px;                      /* Minimum width */
max-width: 80px;                      /* Maximum width */
flex: 0 0 80px;                       /* Fixed width */
```

### Text Alignment
```css
text-align: left;                     /* Left align */
text-align: center;                   /* Center align */
text-align: right;                    /* Right align */
justify-content: flex-start;          /* Left align */
justify-content: center;              /* Center align */
justify-content: flex-end;            /* Right align */
```

## Mobile vs Desktop
```css
@media (max-width: 768px) {           /* Mobile styles */
  /* Mobile-specific rules */
}

@media (min-width: 769px) {           /* Desktop styles */
  /* Desktop-specific rules */
}
```

## Color Coding
```css
color: #FFD700;                       /* Gold (FargoRate) */
color: #4CAF50;                       /* Green (Wins) */
color: #f44336;                       /* Red (Losses) */
color: #fff;                          /* White text */
```

## Common Issues & Solutions

### Element Won't Move
- Check for `!important` flags
- Look for conflicting rules
- Try higher specificity selectors

### Mobile vs Desktop Differences
- Mobile rules are in `@media (max-width: 768px)`
- Desktop rules are in `@media (min-width: 769px)`
- Some rules apply to both

### Conflicting Styles
- More specific selectors override less specific ones
- `!important` overrides normal rules
- Later rules override earlier ones

## Quick Reference for Common Changes

### Move W Column Right
```css
.ladder-table.logged-in-view .header-cell:nth-child(4),
.ladder-table.logged-in-view .table-cell.wins {
  margin-left: 20px !important;
}
```

### Move L Column Right
```css
.ladder-table.logged-in-view .header-cell:nth-child(5),
.ladder-table.logged-in-view .table-cell.losses {
  margin-left: 20px !important;
}
```

### Change FargoRate Color
```css
.ladder-table.logged-in-view .table-cell.fargo-rate {
  color: #FFD700 !important;
}
```

### Make Column Wider
```css
.ladder-table.logged-in-view .header-cell:nth-child(3) {
  min-width: 100px !important;
  max-width: 100px !important;
}
```

## Tips for Editing
1. **Always use `!important`** for positioning changes
2. **Test on both mobile and desktop**
3. **Check browser developer tools** to see which rules are active
4. **Make small changes** and test frequently
5. **Use specific selectors** to avoid conflicts
