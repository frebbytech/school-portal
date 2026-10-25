const router = require('express').Router();
const _ = require('lodash');
const asyncHandler = require('express-async-handler');
const { isValidObjectId } = require('mongoose');
const Notification = require('../models/notificationModel');
const { requireMember, getPrincipal, isSelf } = require('../middlewares/authorize');

// Notifications belong to one person: every query is limited to the caller's own.
router.use(requireMember);

const FORBIDDEN = 'You do not have permission to perform this action.';
const mine = (req) => getPrincipal(req).id;

//GET notification
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
      user: mine(req),
    }).sort({ createdAt: -1 });

    res.status(200).json(notifications);
  })
);

//@GET Notification by id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const notification = isValidObjectId(id)
      ? await Notification.findOne({ _id: id, user: mine(req) })
      : null;
    res.status(200).json(notification);
  })
);

// Edit notification: the only field a recipient may change is `active` (read state)
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { _id, active } = req.body || {};

    const updatedNotification =
      isValidObjectId(_id) && typeof active === 'boolean'
        ? await Notification.findOneAndUpdate(
            { _id, user: mine(req) },
            { $set: { active } },
            { new: true }
          )
        : null;

    if (_.isEmpty(updatedNotification)) {
      return res.status(404).json('Error occurred.Try again later...');
    }

    res.status(200).json('Changes Saved!');
  })
);

// Mark a single notification as read
router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    if (isValidObjectId(req.params.id)) {
      await Notification.updateOne({ _id: req.params.id, user: mine(req) }, { active: false });
    }
    res.status(200).json('Marked as read');
  })
);

// Mark all of the caller's notifications as read
router.put(
  '/:userId/read-all',
  asyncHandler(async (req, res) => {
    if (!isSelf(req, req.params.userId)) return res.status(403).json(FORBIDDEN);

    await Notification.updateMany({ user: mine(req) }, { active: false });
    res.status(200).json('All notifications marked as read');
  })
);

//DELETE several of the caller's notifications
router.delete(
  '/remove',
  asyncHandler(async (req, res) => {
    const ids = [].concat(req.body?.notifications ?? []);
    if (ids.length === 0 || !ids.every((id) => isValidObjectId(id))) {
      return res.status(404).json('Error removing notification.Try again later...');
    }

    const result = await Notification.deleteMany({ _id: { $in: ids }, user: mine(req) });

    if (!result?.deletedCount) {
      return res.status(404).json('Error removing notification.Try again later...');
    }

    res.status(200).json('Notification Removed!');
  })
);

//DELETE notification
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const notification = isValidObjectId(id)
      ? await Notification.findOneAndDelete({ _id: id, user: mine(req) })
      : null;

    if (_.isEmpty(notification)) {
      return res.status(404).json('Error removing notification.Try again later...');
    }

    res.status(200).json('Notification deleted successfully!!!');
  })
);

//DELETE all of the caller's notifications
router.delete(
  '/:id/all',
  asyncHandler(async (req, res) => {
    if (!isSelf(req, req.params.id)) return res.status(403).json(FORBIDDEN);

    const result = await Notification.deleteMany({ user: mine(req) });

    if (!result?.deletedCount) {
      return res.status(404).json('Error removing notification.Try again later...');
    }

    res.status(200).json('Notification deleted successfully!!!');
  })
);

module.exports = router;
