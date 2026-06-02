Do NOT build custom simulated anatomical rendering infrastructure.

The viewer layer must ultimately delegate actual rendering to:

Cornerstone3D

DicomViewportManager
should ONLY orchestrate:

viewport lifecycle
hydration
stack loading
cleanup
synchronization
caching

Avoid investing engineering effort into:

fake grayscale renderers
simulated anatomical canvases
custom imaging pipelines

Use:

official Cornerstone3D viewport engine
official image loaders
Orthanc WADO streaming
GPU-backed rendering

The current implementation is acceptable only as a temporary shell placeholder.

That correction is VERY important.

Otherwise engineering time gets wasted badly.

SECOND IMPORTANT ISSUE:
NO SESSION LOCKING YET

You now NEED:

study claiming rules

Otherwise:
multiple radiologists can:

start sessions
overwrite each other
collide workflows

You now need:

Study
 ├── ClaimedBy
 ├── ClaimedAt
 ├── ActiveSessionId

This becomes VERY important operationally.

THIRD IMPORTANT ISSUE:
RECONNECT RECOVERY

Now that collaboration exists:
you MUST handle:

browser refresh
WiFi drops
workstation sleep
reconnect

Otherwise doctors lose trust instantly.

This matters more than:

calipers
contrast sliders
fancy viewport tools
FOURTH IMPORTANT ISSUE:
AUDIT TRAIL

Now collaboration exists.

That changes medico-legal requirements completely.

You now need:

who typed what
who signed
who edited
session start/end
reconnect events
signature timestamps

This becomes mandatory in real deployments.

FIFTH IMPORTANT ISSUE:
STATUS MODEL STILL NEEDS CLEANUP

You should now FULLY commit to:

ImagingCompleted
AwaitingDictation
DictationInProgress
DraftReady
Signed
Released
Delivered

And remove older:

ResultDrafted
ReadyForReporting

statuses completely.

Otherwise later:
workflow ambiguity starts.