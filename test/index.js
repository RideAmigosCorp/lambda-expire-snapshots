
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
        { SnapshotId: "snap-1234567890abcdef0", StartTime: "1999-12-31T21:28:32.000Z" },
        { SnapshotId: "snap-1234567890abcdef1", StartTime: "1999-12-30T21:28:32.000Z" },
        { SnapshotId: "snap-1234567890abcdef2", StartTime: "1999-12-29T21:28:32.000Z" },
    ]; 

    var retentionRules = {
      now  : moment.utc('1999-12-31'),
      days : 2
    }

    var toDelete = selectSnapsToDelete(snapshots, retentionRules);

    expect(toDelete).length.to.be(1);
    expect(toDelete).to.eql([
        { SnapshotId: "snap-1234567890abcdef2", StartTime: "1999-12-29T21:28:32.000Z" },
    ])

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
