import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { runMigrations } from './migrate.js';

export async function runSeeds() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Ensure schema exists
    await runMigrations();

    // 2. Hash default passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Admin@123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, salt);
    const studentPasswordHash = await bcrypt.hash('Student@123', salt);

    // 3. Super Admin Bootstrap
    const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@campusbid.local').toLowerCase();
    const adminName = process.env.ADMIN_BOOTSTRAP_NAME || 'Super Administrator';

    console.log(`👤 Bootstrapping Super Admin: ${adminEmail}`);
    const adminRes = await query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'SUPER_ADMIN', TRUE)
       ON CONFLICT (email) DO UPDATE 
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'SUPER_ADMIN'
       RETURNING id;`,
      [adminName, adminEmail, adminPasswordHash]
    );
    const adminId = adminRes.rows[0].id;

    // 4. Eligible Students Roster
    console.log('📋 Seeding eligible student roster...');
    const eligibleStudents = [
      { name: 'Aarav Sharma', email: 'aarav.sharma@campus.edu', student_id: 'CS2021001', department: 'Computer Science' },
      { name: 'Priya Patel', email: 'priya.patel@campus.edu', student_id: 'EC2021045', department: 'Electronics & Comm' },
      { name: 'Rohit Verma', email: 'rohit.verma@campus.edu', student_id: 'ME2021078', department: 'Mechanical' },
      { name: 'Sneha Reddy', email: 'sneha.reddy@campus.edu', student_id: 'EE2021033', department: 'Electrical' },
      { name: 'Vikram Singh', email: 'vikram.singh@campus.edu', student_id: 'CE2021012', department: 'Civil Engineering' },
      { name: 'Ananya Iyer', email: 'ananya.iyer@campus.edu', student_id: 'BT2021089', department: 'Biotechnology' },
      { name: 'Karan Mehta', email: 'karan.mehta@campus.edu', student_id: 'CS2022104', department: 'Computer Science' },
      { name: 'Diya Nair', email: 'diya.nair@campus.edu', student_id: 'EC2022022', department: 'Electronics & Comm' },
      { name: 'Alex Student', email: 'alex@campus.edu', student_id: '23CSR001', department: 'Computer Science' }
    ];

    for (const student of eligibleStudents) {
      await query(
        `INSERT INTO eligible_students (name, email, student_id, department, is_eligible)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, student_id = EXCLUDED.student_id, department = EXCLUDED.department, is_eligible = TRUE;`,
        [student.name, student.email.toLowerCase(), student.student_id, student.department]
      );
    }

    // 5. Seed active registered student users
    console.log('🎓 Seeding active student accounts...');
    const studentsToRegister = [
      { name: 'Aarav Sharma', email: 'aarav.sharma@campus.edu', roll_number: 'CS2021001', department: 'Computer Science', year: '4' },
      { name: 'Priya Patel', email: 'priya.patel@campus.edu', roll_number: 'EC2021045', department: 'Electronics & Comm', year: '3' },
      { name: 'Rohit Verma', email: 'rohit.verma@campus.edu', roll_number: 'ME2021078', department: 'Mechanical', year: '4' },
      { name: 'Sneha Reddy', email: 'sneha.reddy@campus.edu', roll_number: 'EE2021033', department: 'Electrical', year: '2' },
      { name: 'Alex Student', email: 'alex@campus.edu', roll_number: '23CSR001', department: 'Computer Science', year: '3' }
    ];

    const studentUserIds = {};
    for (const student of studentsToRegister) {
      const res = await query(
        `INSERT INTO users (name, email, roll_number, department, year, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 'STUDENT', TRUE)
         ON CONFLICT (email) DO UPDATE 
         SET name = EXCLUDED.name, roll_number = EXCLUDED.roll_number, password_hash = EXCLUDED.password_hash
         RETURNING id;`,
        [student.name, student.email.toLowerCase(), student.roll_number, student.department, student.year, studentPasswordHash]
      );
      studentUserIds[student.email] = res.rows[0].id;

      // Mark registered in roster
      await query(
        `UPDATE eligible_students SET registered_at = CURRENT_TIMESTAMP WHERE email = $1;`,
        [student.email.toLowerCase()]
      );
    }

    // 6. Seed initial batch audit history
    await query(
      `INSERT INTO import_batches (admin_id, filename, total_rows, successful_rows, duplicate_rows, invalid_rows)
       VALUES ($1, 'college_initial_roster_2026.csv', 9, 9, 0, 0)
       ON CONFLICT DO NOTHING;`,
      [adminId]
    );

    // 7. Seed sample auctions
    console.log('🏷️ Seeding campus auctions...');
    const now = new Date();

    const sampleAuctions = [
      {
        seller_id: studentUserIds['aarav.sharma@campus.edu'],
        title: 'Hero Sprint Pro 21-Speed Gear Bicycle',
        description: 'Single handedly used for 2 years on campus. Front suspension, Shimano gears, includes combination lock and mudguards. Perfect for moving between Hostel 4 and Academic Blocks.',
        category: 'Cycles',
        condition: 'Good',
        starting_price: 2800.00,
        min_increment: 100.00,
        end_time: new Date(now.getTime() + 48 * 3600 * 1000), // 2 days from now
        status: 'OPEN',
        images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80']
      },
      {
        seller_id: studentUserIds['aarav.sharma@campus.edu'],
        title: 'Casio fx-991EX ClassWiz Scientific Calculator',
        description: 'Original Casio ClassWiz fx-991EX with QR code functionality and high-resolution LCD. Essential for engineering exams. In mint condition with protective hard case.',
        category: 'Calculators',
        condition: 'Like New',
        starting_price: 850.00,
        min_increment: 50.00,
        end_time: new Date(now.getTime() + 8 * 3600 * 1000), // 8 hours (closing soon!)
        status: 'OPEN',
        images: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80']
      },
      {
        seller_id: studentUserIds['rohit.verma@campus.edu'],
        title: 'Engineering Semester 3-6 Textbooks Bundle',
        description: 'Set of 6 standard reference textbooks: Higher Engineering Mathematics (B.S. Grewal), Signals & Systems (Oppenheim), Data Structures in C (Tanenbaum). Clean pages with minimal pencil highlights.',
        category: 'Books',
        condition: 'Good',
        starting_price: 600.00,
        min_increment: 50.00,
        end_time: new Date(now.getTime() + 30 * 3600 * 1000),
        status: 'OPEN',
        images: ['https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80']
      },
      {
        seller_id: studentUserIds['rohit.verma@campus.edu'],
        title: 'Bajaj 1.5L Electric Kettle & Immersion Rod Combo',
        description: 'Lifesaver for hostel midnight maggi and hot water during winter semesters. Automatic cutoff, food-grade stainless steel body.',
        category: 'Hostel Essentials',
        condition: 'Good',
        starting_price: 450.00,
        min_increment: 25.00,
        end_time: new Date(now.getTime() + 5 * 3600 * 1000), // 5 hours (closing soon!)
        status: 'OPEN',
        images: ['https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=800&q=80']
      },
      {
        seller_id: studentUserIds['priya.patel@campus.edu'],
        title: 'Logitech MK270 Wireless Keyboard & Mouse Combo',
        description: 'Reliable 2.4GHz wireless with USB nano receiver. 8 shortcut keys, long battery life, spill-resistant. Used for 1 semester in project lab.',
        category: 'Electronics',
        condition: 'Like New',
        starting_price: 900.00,
        min_increment: 50.00,
        end_time: new Date(now.getTime() + 72 * 3600 * 1000),
        status: 'OPEN',
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80']
      }
    ];

    for (const item of sampleAuctions) {
      // Check if auction already exists with this title
      const checkRes = await query(`SELECT id FROM auctions WHERE title = $1`, [item.title]);
      let auctionId;
      if (checkRes.rows.length > 0) {
        auctionId = checkRes.rows[0].id;
      } else {
        const res = await query(
          `INSERT INTO auctions (seller_id, title, description, category, condition, starting_price, min_increment, end_time, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id;`,
          [item.seller_id, item.title, item.description, item.category, item.condition, item.starting_price, item.min_increment, item.end_time, item.status]
        );
        auctionId = res.rows[0].id;

        // Seed auction images
        for (let i = 0; i < item.images.length; i++) {
          await query(
            `INSERT INTO auction_images (auction_id, image_path, display_order, is_primary)
             VALUES ($1, $2, $3, $4);`,
            [auctionId, item.images[i], i, i === 0]
          );
        }

        // Seed initial bids for the closing-soon calculator
        if (item.category === 'Calculators') {
          const bidder1 = studentUserIds['priya.patel@campus.edu'];
          const bidder2 = studentUserIds['sneha.reddy@campus.edu'];

          await query(
            `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
             VALUES ($1, $2, 850.00, CURRENT_TIMESTAMP - INTERVAL '4 hours');`,
            [auctionId, bidder1]
          );

          await query(
            `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
             VALUES ($1, $2, 900.00, CURRENT_TIMESTAMP - INTERVAL '2 hours');`,
            [auctionId, bidder2]
          );

          await query(
            `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
             VALUES ($1, $2, 950.00, CURRENT_TIMESTAMP - INTERVAL '30 minutes');`,
            [auctionId, bidder1]
          );
        }

        // Seed initial bid for the cycle
        if (item.category === 'Cycles') {
          const bidder = studentUserIds['sneha.reddy@campus.edu'];
          await query(
            `INSERT INTO bids (auction_id, bidder_id, amount, created_at)
             VALUES ($1, $2, 2900.00, CURRENT_TIMESTAMP - INTERVAL '5 hours');`,
            [auctionId, bidder]
          );
        }
      }
    }

    console.log('✅ Seeding completed successfully!');
    console.log('==============================================');
    console.log('🔑 SUPER ADMIN CREDENTIALS:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('🔑 STUDENT CREDENTIALS:');
    console.log(`   Email:    aarav.sharma@campus.edu (or alex@campus.edu)`);
    console.log(`   Password: Student@123`);
    console.log('==============================================');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Auto-run if executed directly via node
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('seed.js');
if (isMain) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
