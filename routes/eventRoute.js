const router = require('express').Router();
const _ = require('lodash');
const asyncHandler = require('express-async-handler');
const { isValidObjectId } = require('mongoose');
const User = require('../models/userModel');
const Event = require('../models/eventModel');
const Notification = require('../models/notificationModel');
const { truncateWords } = require('../config/helper');
const {
  requireMember,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require('../middlewares/authorize');
const { sessionInSchool, termInSchool } = require('../middlewares/tenant');

const adminOnly = requireRoleEnforced('administrator');
const FORBIDDEN = 'You do not have permission to perform this action.';
const EVENT_FIELDS = [
  'session',
  'term',
  'type',
  'title',
  'caption',
  'description',
  'start',
  'end',
  'album',
  'active',
];

const referencesOk = async (req, data) =>
  (data.session === undefined || (await sessionInSchool(req, data.session))) &&
  (data.term === undefined || (await termInSchool(req, data.term)));

//GET event (staff and students of the school)
router.get(
  '/',
  requireMember,
  asyncHandler(async (req, res) => {
    const events = await Event.find({
      school: getPrincipal(req).schoolId,
    })
      .populate('createdBy', ['firstname', 'lastname', 'profile'])
      .sort({ createdAt: -1 });

    res.status(200).json(events);
  })
);

//@GET Event by id
router.get(
  '/:id',
  requireMember,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const event = isValidObjectId(id)
      ? await Event.findOne({ _id: id, school: getPrincipal(req).schoolId }).populate(
          'createdBy',
          ['firstname', 'lastname', 'profile']
        )
      : null;
    res.status(200).json(event);
  })
);

//POST event
router.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const newEvent = pickFields(req.body, EVENT_FIELDS);
    if (!(await referencesOk(req, newEvent))) return res.status(403).json(FORBIDDEN);

    const principal = getPrincipal(req);
    const event = await Event.create({
      ...newEvent,
      school: principal.schoolId,
      createdBy: principal.id,
    });

    if (_.isEmpty(event)) {
      return res
        .status(404)
        .json('Couldnt create event.Please try again later...');
    }

    // Notify the staff of THIS school only (this used to notify every user of every school)
    const users = await User.find({ school: principal.schoolId }, '_id');

    const notifications = users.map((user) => ({
      user: user._id,
      school: principal.schoolId,
      session: newEvent?.session,
      term: newEvent?.term,
      type: 'Event',
      title: newEvent?.title,
      description: truncateWords(newEvent?.caption, 20),
      album: null,
      link: `/events/${event._id}`,
      createdBy: principal.id,
    }));

    await Notification.insertMany(notifications);

    res.status(200).json('Event Created!');
  })
);

//Edit event
router.put(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id } = req.body || {};
    const data = pickFields(req.body, EVENT_FIELDS);

    if (!isValidObjectId(_id)) return res.status(404).json('Error occurred.Try again later...');
    if (!(await referencesOk(req, data))) return res.status(403).json(FORBIDDEN);

    const updatedEvent = await Event.findOneAndUpdate(
      { _id, school: getPrincipal(req).schoolId },
      { $set: data },
      { new: true }
    );

    if (_.isEmpty(updatedEvent)) {
      return res.status(404).json('Error occurred.Try again later...');
    }

    res.status(200).json('Chnages Saved!');
  })
);

//DELETE events (bulk)
router.put(
  '/remove',
  adminOnly,
  asyncHandler(async (req, res) => {
    const ids = [].concat(req.body?.events ?? []);
    if (ids.length === 0 || !ids.every((id) => isValidObjectId(id))) {
      return res.status(404).json('Error removing event.Try again later...');
    }

    const result = await Event.deleteMany({
      _id: { $in: ids },
      school: getPrincipal(req).schoolId,
    });

    if (!result?.deletedCount) {
      return res.status(404).json('Error removing event.Try again later...');
    }

    res.status(200).json('Event Removed!');
  })
);

//DELETE event
router.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const event = isValidObjectId(id)
      ? await Event.findOneAndDelete({ _id: id, school: getPrincipal(req).schoolId })
      : null;

    if (_.isEmpty(event)) {
      return res.status(404).json('Error removing event.Try again later...');
    }

    res.status(200).json('Event deleted successfully!!!');
  })
);

module.exports = router;
