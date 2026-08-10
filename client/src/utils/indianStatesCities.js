import { State, City } from 'country-state-city';

// Fetch all official states & UTs of India ('IN')
export const STATES_LIST = State.getStatesOfCountry('IN')
  .map(s => s.name)
  .sort((a, b) => a.localeCompare(b));

// Fetch all official cities for a given Indian state name
export const getCitiesForState = (stateName) => {
  if (!stateName) return [];
  const stateObj = State.getStatesOfCountry('IN').find(
    s => s.name.toLowerCase() === stateName.trim().toLowerCase()
  );
  if (!stateObj) return [];
  const cities = City.getCitiesOfState('IN', stateObj.isoCode);
  return cities.map(c => c.name).sort((a, b) => a.localeCompare(b));
};
