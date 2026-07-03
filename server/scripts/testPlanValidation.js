require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Gym = require('../models/Gym');
const { getTenantConnection } = require('../utils/connectionManager');
const { runWithTenantContext } = require('../utils/tenantContext');

const testPlanValidation = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (uri && !uri.includes('/platform_db')) {
      const url = require('url');
      try {
        const parsed = new url.URL(uri);
        parsed.pathname = '/platform_db';
        uri = parsed.toString();
      } catch (e) {
        if (uri.includes('?')) {
          uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
        } else {
          uri = uri.endsWith('/') ? uri + 'platform_db' : uri + '/platform_db';
        }
      }
    }
    await mongoose.connect(uri);
    console.log('Connected to platform DB.');

    const gyms = await Gym.find({ isActive: true }).lean();
    if (gyms.length === 0) {
      console.log('No active gyms found in platform DB.');
      process.exit(1);
    }

    const gym = gyms[0];
    console.log(`Running plan validations test inside tenant context: ${gym.dbName}`);

    const conn = await getTenantConnection(gym.dbName);
    
    // Explicitly sync schema indexes
    const Plan = conn.model('Plan');
    await Plan.syncIndexes();

    const Client = conn.model('Client');

    const mockReq = {
      user: { gymId: gym.gymId, gymName: gym.gymName }
    };

    const controllers = require('../controllers/planController');

    // ─── 0. Wrap inside tenant context ───
    await runWithTenantContext({ tenantDb: conn, models: { Plan, Client } }, async () => {
      // ─── 0. Reset State ───
      console.log('\nCleaning up active test plans...');
      await Plan.updateMany({
        $or: [
          { name: { $regex: /^(gold|monthly|basic monthly|monthly duplicate)$/i } },
          { durationMonths: { $in: [1, 2] } }
        ]
      }, { isActive: false });

      // Helper mock res
      const createMockRes = (onDone) => {
        let code = 200;
        const res = {
          status: (c) => { code = c; return res; },
          json: (data) => {
            onDone(code, data);
          }
        };
        return res;
      };

      // ─── 1. Create active plan 'Gold' ───
      console.log('\n1. Creating Custom Plan "Gold":');
      await new Promise((resolve) => {
        const req = {
          body: { name: 'Gold', durationMonths: 3, price: 5000, description: 'Gold membership description', isCustom: true },
          user: mockReq.user
        };
        const res = createMockRes((code, data) => {
          console.log(`Status: ${code}, Success: ${data.success}, Message: ${data.message || 'Plan created successfully'}`);
          resolve();
        });
        controllers.createPlan(req, res, () => {});
      });

      // ─── 2. Create duplicate name 'gold' (casing check) ───
      console.log('\n2. Creating Custom Plan "gold" (should fail):');
      await new Promise((resolve) => {
        const req = {
          body: { name: 'gold', durationMonths: 3, price: 5000, description: 'gold membership description', isCustom: true },
          user: mockReq.user
        };
        const res = createMockRes((code, data) => {
          console.log(`Status: ${code}, Success: ${data.success}, Message: ${data.message}`);
          resolve();
        });
        controllers.createPlan(req, res, () => {});
      });

      // ─── 3. Create duplicate name '  Gold  ' (whitespace check) ───
      console.log('\n3. Creating Custom Plan "  Gold  " (should fail):');
      await new Promise((resolve) => {
        const req = {
          body: { name: '  Gold  ', durationMonths: 3, price: 5000, description: 'gold membership description', isCustom: true },
          user: mockReq.user
        };
        const res = createMockRes((code, data) => {
          console.log(`Status: ${code}, Success: ${data.success}, Message: ${data.message}`);
          resolve();
        });
        controllers.createPlan(req, res, () => {});
      });

      // ─── 4. Create standard plan with duration 1 ───
      console.log('\n4. Creating Standard Plan "Monthly" (1 month):');
      let monthlyPlanId = null;
      await new Promise((resolve) => {
        const req = {
          body: { name: 'Monthly', durationMonths: 1, price: 1500, description: 'Standard 1 Month', isCustom: false },
          user: mockReq.user
        };
        const res = createMockRes((code, data) => {
          console.log(`Status: ${code}, Success: ${data.success}, Message: ${data.message || 'Plan created successfully'}`);
          if (data.success) {
            monthlyPlanId = data.data._id;
          }
          resolve();
        });
        controllers.createPlan(req, res, () => {});
      });

      // ─── 5. Create another standard plan with duration 1 (should fail) ───
      console.log('\n5. Creating another Standard Plan with duration 1 (should fail):');
      await new Promise((resolve) => {
        const req = {
          body: { name: 'Basic Monthly', durationMonths: 1, price: 1200, description: 'Another 1 Month standard plan', isCustom: false },
          user: mockReq.user
        };
        const res = createMockRes((code, data) => {
          console.log(`Status: ${code}, Success: ${data.success}, Message: ${data.message}`);
          resolve();
        });
        controllers.createPlan(req, res, () => {});
      });

      // ─── 6. Try updating standard plan category/duration when assigned (should fail) ───
      if (monthlyPlanId) {
        console.log('\n6. Mocking client assignment to "Monthly" plan and trying to change duration/category:');
        
        // Temporarily assign this planId to an active client
        const activeClient = await Client.findOne({ isActive: true });
        if (activeClient) {
          const originalPlanId = activeClient.membership.planId;
          activeClient.membership.planId = monthlyPlanId;
          await activeClient.save();
          console.log(`Assigned Monthly plan to client: ${activeClient.personalInfo.name}`);

          // Try to update duration on this assigned plan
          await new Promise((resolve) => {
            const req = {
              params: { id: monthlyPlanId.toString() },
              body: { name: 'Monthly', durationMonths: 2, isCustom: false },
              user: mockReq.user
            };
            const res = createMockRes((code, data) => {
              console.log(`Update (change duration) Status: ${code}, Success: ${data.success}, Message: ${data.message}`);
              resolve();
            });
            controllers.updatePlan(req, res, () => {});
          });

          // Restore original plan assignment to client
          activeClient.membership.planId = originalPlanId;
          await activeClient.save();
        } else {
          console.log('Skipped assignment test: No active client found to mock assignment.');
        }
      }
    });

    console.log('\nPlan Validation System verification complete.');
    process.exit(0);
  } catch (error) {
    console.error('Verification error:', error);
    process.exit(1);
  }
};

testPlanValidation();
