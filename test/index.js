
var index = require('../index');
var _ = require('lodash');
var chai = require('chai');
var moment = require('moment');
var expect = chai.expect;

describe('organizeSnapshotsByVolume', function() {
  var organizeSnapshotsByVolume = index.organizeSnapshotsByVolume;

  it("single snapshot should be transformed as expected", function () {
	  // This is taken straight from the AWS docs
    var snapshots = [
        {
            "Description": "This is my snapshot.",
            "VolumeId": "vol-049df61146c4d7901",
            "State": "completed",
            "VolumeSize": 8,
            "Progress": "100%",
            "StartTime": "2014-02-28T21:28:32.000Z",
            "SnapshotId": "snap-1234567890abcdef0",
            "OwnerId": "012345678910"
        }
    ];

		var byVolume = organizeSnapshotsByVolume(snapshots);
		expect(byVolume).to.eql({
				"vol-049df61146c4d7901" : [
						{ SnapshotId: "snap-1234567890abcdef0", StartTime: "2014-02-28T21:28:32.000Z" }
				]
		});
	});

  it("two snapshots for different volumes should be transformed as expected", function () {
	  // This is taken straight from the AWS docs
    var snapshots = [
        {
            "Description": "This is my snapshot.",
            "VolumeId": "vol-049df61146c4d7901",
            "State": "completed",
            "VolumeSize": 8,
            "Progress": "100%",
            "StartTime": "2014-02-28T21:28:32.000Z",
            "SnapshotId": "snap-1234567890abcdef0",
            "OwnerId": "012345678910"
        },
        {
            "Description": "This is my snapshot.",
            "VolumeId": "vol-049df61146c4d7902",
            "State": "completed",
            "VolumeSize": 8,
            "Progress": "100%",
            "StartTime": "2014-02-28T21:28:32.001Z",
            "SnapshotId": "snap-1234567890abcdef1",
            "OwnerId": "012345678910"
        }
    ];

		var byVolume = organizeSnapshotsByVolume(snapshots);
		expect(byVolume).to.eql({
				"vol-049df61146c4d7901" : [ { SnapshotId: "snap-1234567890abcdef0", StartTime: "2014-02-28T21:28:32.000Z" } ],
				"vol-049df61146c4d7902" : [ { SnapshotId: "snap-1234567890abcdef1", StartTime: "2014-02-28T21:28:32.001Z" } ]
		});

  });
});

describe('selectSnapsToDelete', function() {
  var selectSnapsToDelete = index.selectSnapsToDelete;
  it("should select oldest day for deletion when there are snaps for last 3 days and retention rule says to keep one day", function () {

    var snapshots = [
        { SnapshotId: "snap-1234567890abcdef0", StartTime: new Date("1999-12-31T21:28:32.000Z") },
        { SnapshotId: "snap-1234567890abcdef1", StartTime: new Date("1999-12-30T21:28:32.000Z") },
        { SnapshotId: "snap-1234567890abcdef2", StartTime: new Date("1999-12-29T21:28:32.000Z") },
    ]; 

    var retentionRules = {
      now  : moment.utc('1999-12-31'),
      days : 2
    }

    var toDelete = selectSnapsToDelete(snapshots, retentionRules).toDelete;

    expect(toDelete).have.lengthOf(1);
    expect(toDelete).to.eql([
        { SnapshotId: "snap-1234567890abcdef2", StartTime: new Date("1999-12-29T21:28:32.000Z") },
    ])

  });

 it("should pass real world test with lots of snapshots and complex rentention rules", function () {

   var snapshots =[ { "SnapshotId": "snap-e95b2785", "StartTime": new Date("2016-09-08T02:01:03.000Z") } ,
                  { "SnapshotId": "snap-a954f0c7", "StartTime":   new Date("2016-10-15T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-2b836c4f", "StartTime":   new Date("2016-09-17T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-9b0431e2", "StartTime":   new Date("2016-09-27T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-ec4f9394", "StartTime":   new Date("2016-09-30T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-445d6c3c", "StartTime":   new Date("2016-10-03T02:01:03.000Z") } ,
                  { "SnapshotId": "snap-b1706fb3", "StartTime":   new Date("2016-09-18T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-d92c6fdc", "StartTime":   new Date("2016-10-14T02:01:03.000Z") } ,
                  { "SnapshotId": "snap-cd5b23cb", "StartTime":   new Date("2016-09-07T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-22b6493f", "StartTime":   new Date("2016-09-06T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-4b885257", "StartTime":   new Date("2016-10-01T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-d7e848cb", "StartTime":   new Date("2016-09-24T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-f18bdfed", "StartTime":   new Date("2016-10-11T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-5727014b", "StartTime":   new Date("2016-09-26T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-b5d551aa", "StartTime":   new Date("2016-09-25T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-afc0e5b1", "StartTime":   new Date("2016-09-19T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-b4157fa3", "StartTime":   new Date("2016-09-01T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-fb53c4ed", "StartTime":   new Date("2016-09-15T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-13063c05", "StartTime":   new Date("2016-09-20T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-1637aafd", "StartTime":   new Date("2016-09-16T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-99fa7a78", "StartTime":   new Date("2016-10-08T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-2f73d9cd", "StartTime":   new Date("2016-09-10T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-f332ff17", "StartTime":   new Date("2016-09-02T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-8b95e76f", "StartTime":   new Date("2016-08-31T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-11fc57f6", "StartTime":   new Date("2016-09-11T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-07ae8de0", "StartTime":   new Date("2016-10-06T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-e1537950", "StartTime":   new Date("2016-10-10T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-8c29393f", "StartTime":   new Date("2016-10-20T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-c118ed73", "StartTime":   new Date("2016-10-07T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-1a519da8", "StartTime":   new Date("2016-10-05T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-fc5f8f4e", "StartTime":   new Date("2016-09-23T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-b323d206", "StartTime":   new Date("2016-09-22T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-74d173c1", "StartTime":   new Date("2016-10-16T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-f9d8aa4d", "StartTime":   new Date("2016-10-17T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-3938a28e", "StartTime":   new Date("2016-10-18T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-214a6496", "StartTime":   new Date("2016-09-29T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-95e79d23", "StartTime":   new Date("2016-09-28T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-ae170718", "StartTime":   new Date("2016-10-19T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-e7fa996e", "StartTime":   new Date("2016-10-02T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-a71c5f2e", "StartTime":   new Date("2016-10-04T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-213aeea9", "StartTime":   new Date("2016-10-21T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-542463df", "StartTime":   new Date("2016-09-21T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-8737120c", "StartTime":   new Date("2016-10-09T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-8160b90d", "StartTime":   new Date("2016-10-12T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-fbba7463", "StartTime":   new Date("2016-09-03T02:01:03.000Z") } ,
                  { "SnapshotId": "snap-f507e56f", "StartTime":   new Date("2016-09-14T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-327438a8", "StartTime":   new Date("2016-09-04T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-1423b489", "StartTime":   new Date("2016-09-13T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-0cf50990", "StartTime":   new Date("2016-09-12T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-384100a4", "StartTime":   new Date("2016-09-09T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-2b429bb4", "StartTime":   new Date("2016-10-13T02:01:02.000Z") } ,
                  { "SnapshotId": "snap-c7853658", "StartTime":   new Date("2016-09-05T02:01:02.000Z") } ];

    var retentionRules = {
     "days"   : 14,
     "weeks"  : 13,
     "months" : 12,
     "years"  : 1
    }

    var toDelete = selectSnapsToDelete(snapshots, retentionRules).toDelete;

  	// Just reality check the the number of snapshots we start with.
    expect(snapshots).to.have.lengthOf(52);

   expect(toDelete).to.have.lengthOf(31);
 });
});


describe('delParams', function() {
  var delParams = index.delParams;
  it("should replace StartTime with dryRun passed in", function () {
    var snapshots = [
        { SnapshotId: "snap-1", StartTime: "1999-12-31T21:28:32.000Z" },
        { SnapshotId: "snap-2", StartTime: "1999-12-30T21:28:32.000Z" },
    ]; 

    var dryRun = true;

    var params = delParams(snapshots, dryRun);

    expect(params).to.eql([
        { SnapshotId: "snap-1", DryRun: true },
        { SnapshotId: "snap-2", DryRun: true },
    ])

  });
});
