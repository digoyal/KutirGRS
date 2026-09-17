-- Rename existing "Zonal Head" users to "Regional Head"
UPDATE users SET title = 'Regional Head' WHERE title = 'Zonal Head';
