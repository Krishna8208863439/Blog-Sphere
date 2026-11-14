/**
 * Database seed script.
 * Creates the demo user (demo@blogsphere.com / Demo1234!) and 7 sample blogs
 * if they don't already exist.
 *
 * Run once:  node utils/seed.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User  = require('../models/User');
const Blog  = require('../models/Blog');

const DEMO_EMAIL = 'demo@blogsphere.com';

const sampleBlogs = (authorId) => [
  {
    title: 'The quiet rewrite of the personal computer',
    description: 'Laptops did not get louder. They got more considered, and the interesting changes are the ones you barely notice.',
    category: 'Technology',
    image: 'assets/images/cover-technology.svg',
    featured: true,
    status: 'published',
    publishedAt: new Date('2026-11-08T09:00:00.000Z'),
    author: authorId,
    content: `<p>The last decade of personal computers did not announce itself with a single launch. It arrived as a series of small corrections: keyboards with a little more travel, screens that no longer wash out by a window, and batteries that survive a day of ordinary work.</p><p>Those corrections matter more than another spec sheet. A machine you trust disappears. You stop negotiating with it and start finishing the sentence, the sketch, the patch, the lesson plan.</p><p>Look closely at a well-made laptop from this year and you will find the real story in the hinges, the fan curve, and the decision to leave a port where your hand already expects it. None of that trends. All of it changes how a day feels.</p><p>The next rewrite will be just as quiet. Repairable parts, calmer notifications, and software that waits its turn. Progress, at its best, gives attention back.</p>`,
  },
  {
    title: 'What we talk about when we talk about agents',
    description: 'An agent is not a magic coworker. It is a workflow with a language model in the middle, and the design still belongs to you.',
    category: 'AI',
    image: 'assets/images/cover-ai.svg',
    featured: true,
    status: 'published',
    publishedAt: new Date('2026-11-06T12:30:00.000Z'),
    author: authorId,
    content: `<p>Every few months the word "agent" gets a new coat of paint. Strip the marketing away and you usually find a loop: read a goal, choose a tool, observe the result, and try again until a person says stop.</p><p>That loop can be useful. It can also wander. The difference is rarely the model. It is the boundary around the task. A good agent drafts a summary from a folder you chose. A careless one invents a folder you never had.</p><blockquote>Give the system a narrow job, a way to show its work, and a person who can say no.</blockquote><p>If you are building with these tools, write the failure down while it is still small. Which step guessed? Which step should have asked? Those notes are worth more than another demo video.</p><p>Agents will get faster. Judgment does not arrive as a software update. It is a practice, and it still has your name on it.</p>`,
  },
  {
    title: 'Small functions, long careers',
    description: 'The programmers who last are rarely the ones who memorize the most. They are the ones who leave code another person can enter.',
    category: 'Programming',
    image: 'assets/images/cover-programming.svg',
    featured: true,
    status: 'published',
    publishedAt: new Date('2026-11-03T08:15:00.000Z'),
    author: authorId,
    content: `<p>There is a kind of pride that shows up as a very long function. Everything is in one place, the author says. Everything is also in the way.</p><p>A small function is not a moral good. It is a door. Another person can open it, see what comes in, and see what goes out without reconstructing your afternoon.</p><ul><li>Name the result, not the implementation.</li><li>Keep side effects at the edges.</li><li>Let a test describe the behavior you actually care about.</li></ul><p>Careers get long when your future self can still read you. The clever line that saved ten minutes today can cost an hour in six months, usually on a Friday.</p><p>Write the version a teammate can change without asking you to translate it. That is the work.</p>`,
  },
  {
    title: 'A desk that earns its keep',
    description: 'A calmer workspace is not a shopping list. It is a set of decisions about what is allowed to ask for your eyes.',
    category: 'Lifestyle',
    image: 'assets/images/cover-lifestyle.svg',
    featured: false,
    status: 'published',
    publishedAt: new Date('2026-10-28T16:00:00.000Z'),
    author: authorId,
    content: `<p>The internet will sell you a desk that promises a different life. The life usually changes for a week, which is about how long a new lamp stays interesting.</p><p>What lasts is subtraction. A single notebook instead of five. A phone that charges in another room. A chair you can sit in after the second hour.</p><p>I keep a short list taped under the monitor: one task in front of me, water within reach, and no new tab until this paragraph is done. It is not elegant. It is enforceable.</p><p>Make the room slightly quieter than your work requires. The extra quiet is where the next sentence shows up.</p>`,
  },
  {
    title: 'Learning in public, carefully',
    description: 'Sharing what you are learning can teach you faster. It can also turn your notes into a performance. Keep the part that helps you think.',
    category: 'Education',
    image: 'assets/images/cover-education.svg',
    featured: false,
    status: 'published',
    publishedAt: new Date('2026-10-21T11:20:00.000Z'),
    author: authorId,
    content: `<p>Learning in public is a good deal when the audience is a side effect. You explain a concept, discover the hole in your explanation, and patch the hole. The post is evidence, not the point.</p><p>It goes wrong when the post becomes the assignment. You start choosing topics that photograph well and skipping the dull chapter where the real skill lives.</p><p>A useful public note answers three questions. What did I try? What broke? What will I do differently tomorrow? If you can write that in a half page, you learned something. If you need a thread to sound certain, wait a day.</p><p>Students do not need a personal brand. They need a record they can reread. Publish the record when it is honest. Keep the rest in the notebook.</p>`,
  },
  {
    title: 'Batteries, grids, and the next decade',
    description: 'The energy transition is less about a single breakthrough and more about thousands of unglamorous connections.',
    category: 'Technology',
    image: 'assets/images/cover-energy.svg',
    featured: false,
    status: 'published',
    publishedAt: new Date('2026-10-14T07:45:00.000Z'),
    author: authorId,
    content: `<p>A battery is a promise that energy made at noon can be used at night. A grid is the argument about whose promise counts, and how far it has to travel.</p><p>The headlines prefer the laboratory. The work is also in permits, transformers, electricians, and software that keeps a neighborhood steady when a cloud crosses a field of panels.</p><p>None of this is abstract if the lights flicker. Reliability is the product. Chemistry is only one of its ingredients.</p><p>The next decade will reward people who can talk to both the model and the crew on site. The story is technical. It is also civic.</p>`,
  },
  {
    title: 'Field notes from a slower morning',
    description: 'An unfinished draft about leaving the first hour of the day unscheduled.',
    category: 'Lifestyle',
    image: 'assets/images/cover-lifestyle.svg',
    featured: false,
    status: 'draft',
    publishedAt: null,
    author: authorId,
    content: `<p>I have been trying to leave the first hour alone. No inbox. No headline. Just the walk and the page.</p><p>It is still a draft because I do not know yet whether the calm is the routine or the novelty. I will publish this when I have kept it for a month.</p>`,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅  MongoDB connected for seeding.');

    // ── Demo user ──────────────────────────────────────────────────────
    let demoUser = await User.findOne({ email: DEMO_EMAIL });
    if (!demoUser) {
      demoUser = await User.create({
        fullName: 'Ava Ellison',
        email: DEMO_EMAIL,
        username: 'ava',
        password: 'Demo1234!',
        bio: 'Editor at BlogSphere. I write about technology, learning, and the craft of making things.',
      });
      console.log('✅  Demo user created:', demoUser.email);
    } else {
      console.log('ℹ️   Demo user already exists:', demoUser.email);
    }

    // ── Sample blogs ───────────────────────────────────────────────────
    const existingCount = await Blog.countDocuments({ author: demoUser._id });
    if (existingCount === 0) {
      const blogs = await Blog.insertMany(sampleBlogs(demoUser._id));
      console.log(`✅  Inserted ${blogs.length} sample blogs.`);
    } else {
      console.log(`ℹ️   ${existingCount} blogs already exist for demo user — skipping.`);
    }

    console.log('\n🎉  Seed complete!\n');
    console.log('   Demo login: demo@blogsphere.com / Demo1234!\n');
  } catch (err) {
    console.error('❌  Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
