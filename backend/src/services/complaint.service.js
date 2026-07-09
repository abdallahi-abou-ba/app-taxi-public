const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');

const COMPLAINT_INCLUDE = {
  submittedByUser: { select: { id: true, fullName: true, role: true } },
  aboutUser: { select: { id: true, fullName: true, role: true } },
  resolvedByUser: { select: { id: true, fullName: true } },
};

async function findComplaintOrThrow(complaintId) {
  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId }, include: COMPLAINT_INCLUDE });
  if (!complaint) {
    throw new AppError('Complaint not found', 404, 'NOT_FOUND');
  }
  return complaint;
}

async function submitComplaint(submittedByUserId, input) {
  return prisma.complaint.create({
    data: { ...input, submittedByUserId },
    include: COMPLAINT_INCLUDE,
  });
}

async function listComplaints({ status, category, submittedByUserId, page, pageSize }) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 20;
  const where = {
    ...(status && { status }),
    ...(category && { category }),
    ...(submittedByUserId && { submittedByUserId }),
  };

  const [total, complaints] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: COMPLAINT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
  ]);

  return { complaints, total, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) };
}

async function getComplaintById(complaintId) {
  return findComplaintOrThrow(complaintId);
}

async function updateComplaint(complaintId, { status, adminNotes }, resolvedByUserId) {
  await findComplaintOrThrow(complaintId);

  const isTerminal = status === 'RESOLVED' || status === 'CLOSED';
  return prisma.complaint.update({
    where: { id: complaintId },
    data: {
      ...(status && { status }),
      ...(adminNotes !== undefined && { adminNotes }),
      ...(isTerminal && { resolvedAt: new Date(), resolvedByUserId }),
    },
    include: COMPLAINT_INCLUDE,
  });
}

module.exports = { submitComplaint, listComplaints, getComplaintById, updateComplaint };
