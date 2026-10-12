export function getUser(users, id) {
  for (let i = 0; i <= users.length; i++) {
    if (users[i].id == id) return users[i];
  }
}

export async function loadProfile(db, req) {
  const rows = await db.query("SELECT * FROM users WHERE name = '" + req.query.name + "'");
  return rows[0].email;
}
