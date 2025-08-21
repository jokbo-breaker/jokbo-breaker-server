import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Menu } from '../models/Menu';
import { Store } from '../models/Store';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { CreateOrderRequest, CreateOrderResponse, OrderListResponse } from '../types/order.types';

const router = express.Router();

/**
 * @route   POST /order
 * @desc    새 주문 생성
 * @access  Private
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const {
      menuId,
      quantity,
      orderType,
      paymentMethod,
      specialRequests,
      phoneNumber,
      deliveryAddress
    }: CreateOrderRequest = req.body;

    // 입력 검증
    if (!menuId || !quantity || !orderType || !paymentMethod) {
      res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다. (menuId, quantity, orderType, paymentMethod)',
      });
      return;
    }

    if (quantity < 1) {
      res.status(400).json({
        success: false,
        message: '수량은 1 이상이어야 합니다.',
      });
      return;
    }

    // 배달 주소는 선택사항 (GPS 위도/경도로 처리 가능)

    // 메뉴 정보 조회
    const menu = await Menu.findById(menuId).populate('store').lean();
    if (!menu) {
      res.status(404).json({
        success: false,
        message: '메뉴를 찾을 수 없습니다.',
      });
      return;
    }

    const store = menu.store as any;

    // 재고 확인
    if (menu.stockLeft < quantity) {
      res.status(400).json({
        success: false,
        message: `재고가 부족합니다. 현재 재고: ${menu.stockLeft}개`,
      });
      return;
    }

    // 배달 주문 검증
    if (orderType === 'delivery') {
      if (!menu.isDeliveryAvailable || !store.supportsDelivery) {
        res.status(400).json({
          success: false,
          message: '이 메뉴는 배달이 불가능합니다.',
        });
        return;
      }
    }

    // 가격 계산
    const unitPrice = orderType === 'pickup' ? menu.pickupPrice : menu.discountedPrice;
    const totalPrice = unitPrice * quantity;
    const totalGrams = menu.gramPerUnit * quantity;
    const deliveryFee = orderType === 'delivery' ? (menu.deliveryPrice || 0) : 0;
    const finalAmount = totalPrice + deliveryFee;

    // 주문 생성
    const orderData = {
      userId: user._id,
      storeId: store._id,
      storeName: store.name,
      items: [{
        menuId: menu._id,
        menuName: menu.name,
        quantity,
        gramPerUnit: menu.gramPerUnit,
        unitPrice,
        totalPrice,
        totalGrams,
      }],
      orderType,
      paymentMethod,
      totalQuantity: quantity,
      totalAmount: totalPrice,
      totalGrams,
      deliveryFee,
      finalAmount,
      pickupStartTime: orderType === 'pickup' ? menu.pickupStartTime : null,
      pickupEndTime: orderType === 'pickup' ? menu.pickupEndTime : null,
      deliveryStartTime: orderType === 'delivery' ? menu.deliveryStartTime : null,
      specialRequests: specialRequests || null,
      phoneNumber: phoneNumber || null,
      deliveryAddress: deliveryAddress || null,
    };

    const order = new Order(orderData);
    await order.save();

    // 메뉴 재고 감소 및 판매량 증가
    await Menu.findByIdAndUpdate(menuId, {
      $inc: {
        stockLeft: -quantity,
        totalSoldCount: quantity,
      }
    });

    // 사용자 누적 통계 업데이트
    await User.findByIdAndUpdate(user._id, {
      $inc: {
        totalPurchaseCount: 1,
        totalFoodAmount: totalGrams,
      }
    });

    console.log('🎉 ===== 주문 생성 완료 =====');
    console.log('👤 주문자:', user.name);
    console.log('🏪 매장:', store.name);
    console.log('🍔 메뉴:', menu.name, `x${quantity}`);
    console.log('💰 결제 금액:', finalAmount, '원');
    console.log('📦 주문 유형:', orderType);
    console.log('💳 결제 방법:', paymentMethod);
    console.log('===============================');

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    const response: CreateOrderResponse = {
      success: true,
      message: '주문이 성공적으로 생성되었습니다.',
      order: {
        orderId: (order._id as any).toString(),
        storeName: store.name,
        items: order.items,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        totalQuantity: order.totalQuantity,
        totalAmount: order.totalAmount,
        totalGrams: order.totalGrams,
        deliveryFee: order.deliveryFee,
        finalAmount: order.finalAmount,
        status: order.status,
        orderDate: fmt(order.orderDate),
        pickupStartTime: order.pickupStartTime ? fmt(order.pickupStartTime) : undefined,
        pickupEndTime: order.pickupEndTime ? fmt(order.pickupEndTime) : undefined,
        deliveryStartTime: order.deliveryStartTime ? fmt(order.deliveryStartTime) : undefined,
        phoneNumber: order.phoneNumber || undefined,
        deliveryAddress: order.deliveryAddress || undefined,
        specialRequests: order.specialRequests || undefined,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ 주문 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   GET /order
 * @desc    사용자의 주문 내역 조회
 * @access  Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId: user._id })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await Order.countDocuments({ userId: user._id });

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    const response: OrderListResponse = {
      success: true,
      message: '주문 내역 조회 성공',
      orders: orders.map(order => ({
        orderId: (order._id as any).toString(),
        storeName: order.storeName,
        items: order.items,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        totalQuantity: order.totalQuantity,
        totalAmount: order.totalAmount,
        totalGrams: order.totalGrams,
        finalAmount: order.finalAmount,
        status: order.status,
        orderDate: fmt(order.orderDate),
      })),
      totalCount,
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 주문 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

/**
 * @route   GET /order/:orderId
 * @desc    특정 주문 상세 정보 조회
 * @access  Private
 */
router.get('/:orderId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      userId: user._id,
    }).lean();

    if (!order) {
      res.status(404).json({
        success: false,
        message: '주문을 찾을 수 없습니다.',
      });
      return;
    }

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${yyyy}${MM}${dd} ${HH}:${mm}:${ss}`;
    };

    const response: CreateOrderResponse = {
      success: true,
      message: '주문 상세 정보 조회 성공',
      order: {
        orderId: (order._id as any).toString(),
        storeName: order.storeName,
        items: order.items,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        totalQuantity: order.totalQuantity,
        totalAmount: order.totalAmount,
        totalGrams: order.totalGrams,
        deliveryFee: order.deliveryFee,
        finalAmount: order.finalAmount,
        status: order.status,
        orderDate: fmt(order.orderDate),
        pickupStartTime: order.pickupStartTime ? fmt(order.pickupStartTime) : undefined,
        pickupEndTime: order.pickupEndTime ? fmt(order.pickupEndTime) : undefined,
        deliveryStartTime: order.deliveryStartTime ? fmt(order.deliveryStartTime) : undefined,
        phoneNumber: order.phoneNumber || undefined,
        deliveryAddress: order.deliveryAddress || undefined,
        specialRequests: order.specialRequests || undefined,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('❌ 주문 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
});

export default router;
