# Legal Data Discovery

This feature provides comprehensive legal data search and discovery capabilities with persistent state management.

## Features

- **Multi-tab Search Interface**: Search by PAN No, Aadhaar No, Address, Name + Address, Section-wise, and Case No
- **Advanced Filtering**: Filter results by legal acts, risk scores, verification status, and date ranges
- **Persistent State Management**: Search form state and filters are automatically saved and restored
- **Real-time Search**: Instant search results with pagination support

## State Persistence

The application now uses Zustand for state management with automatic persistence to localStorage. This ensures that:

1. **Search Form State**: All form inputs, selected tabs, and field values are automatically saved
2. **Filter State**: Applied filters are persisted across page refreshes and navigation
3. **Search Metadata**: Search IDs and timestamps are stored for continuity
4. **Auto-restoration**: When returning to the page, previous search state is automatically restored
5. **Smart Validation**: Stored state is validated for freshness (30-minute expiration)

## How It Works

### When User Clicks Search Button

1. **State Storage**: The current form state is immediately saved to Zustand store
2. **API Call**: The search API is called with the form data
3. **Persistence**: Search metadata (ID, timestamp) is stored for future reference
4. **URL Update**: The search ID is added to the URL for shareable links

### State Restoration

1. **Page Load**: On component mount, the store checks for valid persisted state
2. **Auto-search**: If valid state exists and no current search is active, the search is automatically triggered
3. **Form Population**: The search form is populated with the stored values
4. **Filter Restoration**: Applied filters are restored to their previous state

### State Expiration

- Search state expires after 30 minutes to ensure data relevance
- Expired state is automatically cleared
- Users can manually clear state using the clear search functionality

## Technical Implementation

### Zustand Store Structure

```typescript
interface SearchStore {
  searchFormState: SearchFormState | null
  filterState: FilterState | null
  lastSearchTimestamp: number | null
  searchIdfKey: string | null

  setSearchFormState: (state: SearchFormState) => void
  setFilterState: (state: FilterState) => void
  setSearchMetadata: (searchId: string, timestamp: number) => void
  clearSearchState: () => void
  hasValidSearchState: () => boolean
}
```

### Key Components

- **SearchForm**: Automatically saves state on input changes and search button clicks
- **LegalDataDiscovery**: Main component that orchestrates state restoration and auto-search
- **useLegalDataSearch**: Hook that manages search API calls and state synchronization
- **searchStore**: Zustand store with persistence middleware

### Storage Keys

- `legal-discovery-search-store`: Main store data
- Automatic serialization/deserialization of complex objects
- Efficient partial state updates

## Benefits

1. **User Experience**: No more lost search queries or filter settings
2. **Navigation**: Users can navigate away and return without losing work
3. **Shareability**: Search URLs can be shared with preserved state
4. **Performance**: Reduced API calls through smart state restoration
5. **Reliability**: Robust error handling and state validation

## Future Enhancements

- Search history management
- Saved search queries
- Export search configurations
- Advanced state analytics
