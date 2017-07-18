"use strict";
var async  = require('async');
var moment = require('moment');
var assert = require('assert');
var aws    = require("aws-sdk");
var gfs    = require('grandfatherson');
var _      = require("lodash");


var ec2;


class ExpireSnapshots {
  // Main logic for the Lamda event handler
  static handler (event, context, handlerCallback) {

    // If you don't provide a regions array, default to the region Lambda is running in.
    if (!event.regions) {
      event.regions = [process.env.AWS_REGION];
    }

    // Using CloudWatch, The config is passed as an event using the "Constant (JSON text)" option
    const config = event;

    // validate event
    if (!config.hasOwnProperty('filters')) {
      return handlerCallback('filters must be passed in event.  ex:  "filters": [ { "Name": "tag:Name", "Values": [ "automated-backup" ] } ]');
    }
    if (!config.hasOwnProperty('dryRun')) {
      return handlerCallback("config.dryRun is required.");
    }

    if (!config.hasOwnProperty('retentionRules')) {
      return handlerCallback("config.retentionRules is required.");
    }

    // Run the snapshots in all configured regions
    config.regions.map(function (region) {
      console.log("START snapshot expiration for region: "+region);

      ec2 = new aws.EC2({apiVersion: "2016-09-15", "region": region});

      // Use filters to find a list of volume Ids to pass to ec2-expire-snapshots
      // We always want DryRun:false here, because describing the snapshots is a safe, read-only operation
      ec2.describeSnapshots({ DryRun: false, Filters: config.filters }, function(err, data) {
        if (err) {
          return handlerCallback(err, err.stack);
        }

        var byVolume = ExpireSnapshots.organizeSnapshotsByVolume(data.Snapshots);

        var filteredSnaps = [];

        // For each volume ID, delete volumes according to retention rules.
        // If dryRun was provided, don't delete just return what we would do.
        // When we are done, callback to note we are done with the Lambda function
        async.mapSeries(Object.keys(byVolume), function (volId, volumeCallback) {
          var filteredSnaps = ExpireSnapshots.selectSnapsToDelete( byVolume[volId], config.retentionRules );

          // Not Debugging! Leave this in.
          console.info("For %s keeps snaps with these relative ages %j",volId,filteredSnaps.toKeep.reverse());

          // Delete all snapshots, possibly  with the dry run flag,
          // then callback to note we are done with the current volume
          var snapsToDeleteParams  = ExpireSnapshots.delParams(filteredSnaps.toDelete, config.dryRun);
          async.mapSeries(snapsToDeleteParams, ExpireSnapshots.delOneSnap, volumeCallback);
        }, function (err, results) {
          if (err) {
            console.log("ERROR");
            console.dir(err)
          } else {
            console.log("SUCCESS");
          }

          console.log("RESULTS");
          console.dir(results)
          console.log("END snapshot expiration for region: "+region);
          handlerCallback();
        });
      });
    })
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

  // Given an array of snapshots
  // given as { SnapshotId: snapId : StartTime: 'createdDate' } and grandfatherson retention rules,
  // filter list to those would be deleted.
  // Object returned contains both 'toDelete' array with filtered dates and `toKeep` array with just date strings
  // The toKeep array contains humanized-strings-- not dates-- for debugging / dry runs to manually confirm correctness

  static selectSnapsToDelete (snapshots, retentionRules) {
    var filteredSnaps = [];

    var datesToDelete = gfs.toDelete( _.map(snapshots,'StartTime'), retentionRules );

    var datesToDeleteAsISO = datesToDelete.map(function (dt) { return dt.toISOString()  } );

     // If the snapshot date matches one of the dates to delete, mark it for deletion
     var snapsToDelete = _.filter(snapshots, function (snapshot) {
        // Remember that indexOf can return zero as match
        if (datesToDeleteAsISO.indexOf(snapshot.StartTime.toISOString()) >= 0) {
          return true
        }
     });

    var datesToKeep = gfs.toKeep( _.map(snapshots,'StartTime'), retentionRules );
    // Return human-friendly ages of snapshots to keep.
    // These dates are relative the newest snapshot.
    var datesToKeepHumanized = datesToKeep.map(function (dt) {
        return moment.duration(moment.utc(_.last(datesToKeep)).diff(dt)).humanize()+' ago'
    });

    return { 
        toDelete: snapsToDelete,
        toKeep: datesToKeepHumanized
    }
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
    const PAUSE_MILLISECONDS = 100; // Avoid AWS throttling.
    setTimeout(function () {
       ec2.deleteSnapshot(params, function(err, data) {
         if (err) {
           if (err.hasOwnProperty("code") && err.code == "DryRunOperation") {
             //data = err;
             data = 'DRY RUN: Would delete snapshot-id '+params.SnapshotId;
             err = null;
           }
           callback(err, data);
         }
         // Deleting was successful and it was not a dry run. Log and callback
         else {
           callback(null, data);
         }
     });
    }, PAUSE_MILLISECONDS);
  }
}

module.exports = ExpireSnapshots;
