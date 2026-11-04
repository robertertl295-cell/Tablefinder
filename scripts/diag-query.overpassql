[out:json][timeout:15][bbox:52.48511,13.39814,52.51209,13.44246];
(
  nwr["amenity"~"^(restaurant|cafe|bar|pub|biergarten|fast_food|food_court|ice_cream)$"]["name"](around:1500,52.498600,13.420300);
  nwr["shop"="bakery"]["name"](around:1500,52.498600,13.420300);
);
out center tags qt;