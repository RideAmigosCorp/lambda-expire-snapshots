"use strict";
var async  = require('async');
var assert = require('assert');
var aws    = require("aws-sdk");
var gfs    = require('grandfatherson');
var _      = require("lodash");
var ec2    = new aws.EC2({apiVersion: "2016-09-15" });


class ExpireSnapshots {
  // Main logic for the Lamda event handler
  static handler (event, context, callback) {

    var self = this;

    // Using CloudWatch, The config is passed as an event using the "Constant (JSON text)" option
    const config = event;

    // validate event
    if (!config.hasOwnProperty('filters')) {
      return context.done('filters must be passed in event.  ex:  "filters": [ { "Name": "tag:Name", "Values": [ "automated-backup" ] } ]');
    }
    if (!config.hasOwnProperty('dryRun')) {
      return context.done("config.dryRun is required.");
    }

    if (!config.hasOwnProperty('retentionRules')) {
      return context.done("config.retentionRules is required.");
    }

    // Use filters to find a list of volume Ids to pass to ec2-expire-snapshots
    // We always want DryRun:false here, because describing the snapshots is a safe, read-only operation
    ec2.describeSnapshots({ DryRun: false, Filters: config.filters }, function(err, data) {
      if (err) {
        return context.done(err, err.stack);
      }

      var byVolume = self.organizeSnapshotsByVolume(data.snapshots);

      // For each volume ID, delete volumes according to retention rules.
      // If dryRun was provided, don't delete just return what we would do.
      // When we are done, callback to note we are done with the Lambda function
      async.map(Object.keys(byVolume), function (volId, volumeCallback) {
        var snapsToDelete = self.selectSnapsToDelete( byVolume[volId], config.retentionRules );

        // Delete all snapshots, possibly  with the dry run flag,
        // then callback to note we are done with the current volume
        var snapsToDeleteParams  = self.delParams(snapsToDelete, config.dryRun);
        async.map(snapsToDeleteparams, self.delOneSnap, function(err, results) {
          return volumeCallback(err, results);
        });

      }, lambdaCallback);
    });
  }

  /*
    Re-organize the snapshots based on volume IDs.
    Given 'Snapshots' array as returned from EC2 API,
    Create an object with just the SnapshotId and StartTime picked
    {
       "vol-049df61146c4d7901" : [ { SnapshotId: "snap-1234567890abcdef0", StartTime: "2014-02-28T21:28:32.000Z"  }, ... ],
      ...
    }
  */
  static organizeSnapshotsByVolume (snapshots) {
    var byVolume = {};

    snapshots.map(function (snap) {
        if (!byVolume[snap.VolumeId]) {
          byVolume[snap.VolumeId] = [];
        }

        byVolume[snap.VolumeId].push(_.pick(snap, ['SnapshotId','StartTime']));
    });

    return byVolume;

  } 

  // Given an array of snapshots given as { SnapshotId: snapId : StartTime: 'createdDate' } and grandfatherson retention rules,
  // filter list to those would be deleted.
  static selectSnapsToDelete (snapshots, retentionRules) {
    var filteredSnaps = [];

    var datesToDelete = gfs.toDelete( _.map(snapshots,'StartTime'), retentionRules );

    var datesToDeleteAsISO = datesToDelete.map(function (dt) { return dt.toISOString()  } );

     // If the snapshot date matches one of the dates to delete, mark it for deletion
     var snapsToDelete = _.filter(snapshots, function (snapshot) {
        // Remember that indexOf can return zero as match
        if (datesToDeleteAsISO.indexOf(snapshot.StartTime) >= 0)
          return true
     });

    return snapsToDelete;
  }

  // Given array of objects which contain SnapshotId, transform them into array of params
  // to pass to ec2.deleteSnapshot, factoring config.dryRun setting
  static delParams (snapshots, dryRun) {
    return _.chain(snapshots)
            .map(function(o) { return _.pick(o, "SnapshotId"); })
            .map(function(o) { return _.extend(o, { DryRun: dryRun }); })
            .value();
  }

  // async map iterator
  static delOneSnap (params, callback) {
     console.log("Deleted snapshotId : ", params);
     ec2.deleteSnapshot(params, function(err, data) {
       if (err) {
         if (err.hasOwnProperty("code") && err.code == "DryRunOperation") {
           data = err;
           err = null;
         }
       }
       callback(err, data);
     });
  }
}

module.exports = ExpireSnapshots;
