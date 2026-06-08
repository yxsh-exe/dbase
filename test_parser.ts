import { Parser } from 'node-sql-parser';
const parser = new Parser();
try {
  const ast = parser.astify(`
    CREATE TABLE users (
      id INT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      profile_id INT,
      CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES profiles(id)
    );
  `);
  console.log(JSON.stringify(ast, null, 2));
} catch (e) {
  console.error(e);
}
